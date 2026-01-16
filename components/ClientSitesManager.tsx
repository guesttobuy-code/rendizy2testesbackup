import { useState, useEffect } from 'react';
import { Plus, Globe, Code, Settings, Eye, Trash2, Upload, ExternalLink, Copy, Check, FileText, Sparkles, Download, History, X, Package } from 'lucide-react';
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
import { 
  CLIENT_SITES_PUBLIC_CONTRACT_V1, 
  CLIENT_SITES_BLOCKS_CATALOG,
  CATALOG_VERSION,
  CATALOG_UPDATED_AT,
  generatePromptFromCatalog
} from './client-sites/catalog';

// ============================================================
// TIPOS
// ============================================================

// Configuração de provedor de hospedagem individual
interface HostingProviderConfig {
  access_token?: string;
  team_id?: string;
  project_id?: string;
  project_name?: string;
  domain?: string;
  last_deployment_id?: string;
  last_deployment_url?: string;
  last_deployment_status?: string;
  last_deployment_at?: string;
  use_global_token?: boolean; // se true, usa token global do sistema
}

// Estrutura de todos os provedores de hospedagem
interface HostingProviders {
  active_provider?: 'vercel' | 'netlify' | 'cloudflare_pages' | 'none';
  vercel?: HostingProviderConfig;
  netlify?: HostingProviderConfig;
  cloudflare_pages?: HostingProviderConfig;
}

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
  hostingProviders?: HostingProviders;
  siteCode?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

type ClientSiteUploadStepStatus = 'completed' | 'skipped' | 'pending' | 'failed';
type ClientSiteUploadStep = {
  step: number;
  name?: string;
  message?: string;
  status: ClientSiteUploadStepStatus;
};

type UploadArchiveResponse = {
  success: boolean;
  message?: string;
  error?: string;
  details?: string;
  data?: any;
  steps?: ClientSiteUploadStep[];
};

function stepBadgeVariant(
  status: ClientSiteUploadStepStatus
): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (status === 'completed') return 'default';
  if (status === 'skipped') return 'secondary';
  if (status === 'failed') return 'destructive';
  return 'outline';
}

function getVercelPreviewUrl(subdomain: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/site/${encodeURIComponent(subdomain)}/`;
}

async function verifyClientSiteIsServing(
  subdomain: string
): Promise<{ ok: boolean; details?: string }> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const vercelDebugUrl = origin
    ? `${origin}/api/site?subdomain=${encodeURIComponent(subdomain)}&debug=1`
    : '';

  const siteUrl = origin
    ? `${origin}/site/${encodeURIComponent(subdomain)}/?v=${Date.now()}`
    : '';

  async function verifyRuntimeConfigFromBundle(): Promise<{ ok: boolean; details?: string }> {
    if (!siteUrl) return { ok: true };

    const htmlResp = await fetch(siteUrl, { method: 'GET', cache: 'no-store' as RequestCache });
    const html = await htmlResp.text().catch(() => '');
    if (!htmlResp.ok) {
      return { ok: false, details: html ? html.slice(0, 800) : `Site respondeu HTTP ${htmlResp.status}` };
    }

    const scriptSrcs = Array.from(html.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi)).map(
      (m) => m[1]
    );
    const jsAsset = scriptSrcs.find((s) => /(^|\/)(assets\/.*\.js)(\?|$)/i.test(s)) || '';
    if (!jsAsset) return { ok: true };

    const jsUrlObj = new URL(jsAsset, siteUrl);
    if (!jsUrlObj.searchParams.has('v')) {
      jsUrlObj.searchParams.set('v', String(Date.now()));
    }
    const jsUrl = jsUrlObj.toString();
    const jsResp = await fetch(jsUrl, { method: 'GET', cache: 'no-store' as RequestCache });
    const js = await jsResp.text().catch(() => '');
    if (!jsResp.ok) {
      return { ok: false, details: js ? js.slice(0, 800) : `JS respondeu HTTP ${jsResp.status}` };
    }

    const hasSupabaseRequired = js.includes('supabaseUrl is required');
    const hasRuntimeFallback = js.includes('__RENDIZY_SUPABASE_URL__') || js.includes('RENDIZY_CONFIG');
    const hasHardcodedSupabaseUrl = /https:\/\/[a-z0-9-]+\.supabase\.co/i.test(js);

    if (hasSupabaseRequired && !hasRuntimeFallback && !hasHardcodedSupabaseUrl) {
      return {
        ok: false,
        details:
          'Esse ZIP parece ter sido gerado sem SUPABASE_URL/VITE_SUPABASE_URL (o bundle contém "supabaseUrl is required").\n' +
          'Isso costuma causar tela branca no browser. Solução: garantir que o proxy injete runtime config (SUPABASE_URL + SUPABASE_ANON_KEY) ou rebuildar o site com as variáveis VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY.'
      };
    }

    return { ok: true };
  }

  // Prefer Vercel proxy (best signal for /site/<subdomain>/).
  if (vercelDebugUrl) {
    try {
      const r = await fetch(vercelDebugUrl, { method: 'GET', cache: 'no-store' as RequestCache });
      const txt = await r.text().catch(() => '');
      if (r.ok) {
        const runtime = await verifyRuntimeConfigFromBundle();
        if (!runtime.ok) return runtime;
        return { ok: true };
      }
      return { ok: false, details: txt ? txt.slice(0, 800) : `Proxy respondeu HTTP ${r.status}` };
    } catch {
      // fallback below
    }
  }

  // Fallback: check Supabase serve redirect.
  try {
    const serveUrl = `https://${projectId}.supabase.co/functions/v1/rendizy-public/client-sites/serve/${encodeURIComponent(
      subdomain
    )}`;
    const r = await fetch(serveUrl, { method: 'GET', redirect: 'manual', cache: 'no-store' as RequestCache });
    const loc = r.headers.get('location');
    if (!loc) {
      const txt = await r.text().catch(() => '');
      return { ok: false, details: txt ? txt.slice(0, 800) : 'Supabase serve não retornou redirect' };
    }
    const indexResp = await fetch(loc, { method: 'GET', cache: 'no-store' as RequestCache });
    if (!indexResp.ok) {
      const txt = await indexResp.text().catch(() => '');
      return { ok: false, details: txt ? txt.slice(0, 800) : `Index no Storage respondeu HTTP ${indexResp.status}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, details: e?.message ? String(e.message) : String(e) };
  }
}

function getEdgeHeaders(contentType?: string): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('rendizy-token') : null;

  const headers: Record<string, string> = {
    apikey: publicAnonKey,
    Authorization: `Bearer ${publicAnonKey}`,
  };

  if (token) {
    headers['X-Auth-Token'] = token;
  }

  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  return headers;
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
            ...getEdgeHeaders('application/json')
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
            ...getEdgeHeaders('application/json')
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
    if (site.domain) {
      return site.domain.startsWith('http') ? site.domain : `https://${site.domain}`;
    }
    // Preview estável via Vercel (evita limitações de headers/CSP do Supabase para HTML)
    // Mantém padrão único: https://rendizy2testesbackup.vercel.app/site/<subdomain>/
    return `https://rendizy2testesbackup.vercel.app/site/${site.subdomain}/`;
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
            Documentação prompt sites I.A
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

      {/* Modal Documentação prompt sites I.A */}
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
    template: 'custom',
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
            ...getEdgeHeaders('application/json')
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
  const [showVercelToken, setShowVercelToken] = useState(false);
  const [hostingTab, setHostingTab] = useState<'vercel' | 'netlify' | 'cloudflare'>('vercel');
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
    isActive: site.isActive,
    // Hosting providers
    hostingActiveProvider: site.hostingProviders?.active_provider || 'vercel',
    vercelUseGlobalToken: site.hostingProviders?.vercel?.use_global_token ?? true,
    vercelAccessToken: site.hostingProviders?.vercel?.access_token || '',
    vercelTeamId: site.hostingProviders?.vercel?.team_id || '',
    netlifyUseGlobalToken: site.hostingProviders?.netlify?.use_global_token ?? true,
    netlifyAccessToken: site.hostingProviders?.netlify?.access_token || '',
    netlifySiteId: site.hostingProviders?.netlify?.site_id || '',
    cloudflareApiToken: site.hostingProviders?.cloudflare_pages?.access_token || '',
    cloudflareAccountId: site.hostingProviders?.cloudflare_pages?.account_id || ''
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
            hostingProviders: {
              active_provider: data.hostingActiveProvider,
              vercel: {
                use_global_token: data.vercelUseGlobalToken,
                access_token: data.vercelUseGlobalToken ? undefined : data.vercelAccessToken,
                team_id: data.vercelTeamId || undefined
              },
              netlify: {
                use_global_token: data.netlifyUseGlobalToken,
                access_token: data.netlifyUseGlobalToken ? undefined : data.netlifyAccessToken,
                site_id: data.netlifySiteId || undefined
              },
              cloudflare_pages: {
                access_token: data.cloudflareApiToken || undefined,
                account_id: data.cloudflareAccountId || undefined
              }
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
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="geral">Geral</TabsTrigger>
            <TabsTrigger value="contato">Contato</TabsTrigger>
            <TabsTrigger value="design">Design</TabsTrigger>
            <TabsTrigger value="recursos">Recursos</TabsTrigger>
            <TabsTrigger value="hospedagem">🌐 Hospedagem</TabsTrigger>
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

              <p className="text-xs text-gray-500">
                Primeiro envio deve ser um ZIP com dist/ (sem Vercel) para gerar o archive_path. Depois disso, o build via Vercel pode ser usado.
              </p>

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

          {/* ABA: HOSPEDAGEM */}
          <TabsContent value="hospedagem" className="space-y-4">
            <Alert className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <Globe className="h-4 w-4" />
              <AlertTitle>Provedores de Hospedagem</AlertTitle>
              <AlertDescription>
                Configure onde o site será publicado. Você pode usar o token global do Rendizy 
                ou configurar credenciais específicas da conta do cliente.
              </AlertDescription>
            </Alert>

            {/* Sub-tabs para provedores */}
            <div className="border rounded-lg">
              <div className="flex border-b bg-gray-50 rounded-t-lg">
                <button
                  type="button"
                  onClick={() => setHostingTab('vercel')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    hostingTab === 'vercel'
                      ? 'bg-white text-black border-b-2 border-blue-500 rounded-tl-lg'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  ▲ Vercel
                </button>
                <button
                  type="button"
                  onClick={() => setHostingTab('netlify')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    hostingTab === 'netlify'
                      ? 'bg-white text-black border-b-2 border-teal-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  ◆ Netlify
                </button>
                <button
                  type="button"
                  onClick={() => setHostingTab('cloudflare')}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                    hostingTab === 'cloudflare'
                      ? 'bg-white text-black border-b-2 border-orange-500 rounded-tr-lg'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  ☁️ Cloudflare Pages
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* VERCEL */}
                {hostingTab === 'vercel' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <Label htmlFor="vercelUseGlobal" className="font-medium">
                          Usar Token Global do Rendizy
                        </Label>
                        <p className="text-sm text-gray-500">
                          O site será publicado na conta Vercel do Rendizy
                        </p>
                      </div>
                      <Switch
                        id="vercelUseGlobal"
                        checked={formData.vercelUseGlobalToken}
                        onCheckedChange={(checked) => setFormData({ 
                          ...formData, 
                          vercelUseGlobalToken: checked 
                        })}
                      />
                    </div>

                    {!formData.vercelUseGlobalToken && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="vercelToken">
                            Token de Acesso da Vercel *
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="vercelToken"
                              type={showVercelToken ? 'text' : 'password'}
                              value={formData.vercelAccessToken}
                              onChange={(e) => setFormData({ 
                                ...formData, 
                                vercelAccessToken: e.target.value 
                              })}
                              placeholder="xxxxxxxxxxxxxxxxxx"
                              className="font-mono"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setShowVercelToken(!showVercelToken)}
                            >
                              {showVercelToken ? <Eye className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                          <p className="text-xs text-gray-500">
                            Obtenha em: <a 
                              href="https://vercel.com/account/tokens" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              vercel.com/account/tokens
                            </a>
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="vercelTeamId">
                            Team ID (opcional)
                          </Label>
                          <Input
                            id="vercelTeamId"
                            value={formData.vercelTeamId}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              vercelTeamId: e.target.value 
                            })}
                            placeholder="team_xxxxxxxxxxxx"
                            className="font-mono"
                          />
                          <p className="text-xs text-gray-500">
                            Necessário apenas se a conta pertencer a um time
                          </p>
                        </div>
                      </>
                    )}

                    {/* Info do último deployment */}
                    {site.hostingProviders?.vercel?.last_deployment_url && (
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-green-800">Último Deploy</p>
                            <p className="text-sm text-green-600">
                              {site.hostingProviders.vercel.last_deployment_status}
                            </p>
                          </div>
                          <a
                            href={site.hostingProviders.vercel.last_deployment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Ver site
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* NETLIFY */}
                {hostingTab === 'netlify' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <Label htmlFor="netlifyUseGlobal" className="font-medium">
                          Usar Token Global do Rendizy
                        </Label>
                        <p className="text-sm text-gray-500">
                          O site será publicado na conta Netlify do Rendizy
                        </p>
                      </div>
                      <Switch
                        id="netlifyUseGlobal"
                        checked={formData.netlifyUseGlobalToken}
                        onCheckedChange={(checked) => setFormData({ 
                          ...formData, 
                          netlifyUseGlobalToken: checked 
                        })}
                      />
                    </div>

                    {!formData.netlifyUseGlobalToken && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="netlifyToken">
                            Personal Access Token *
                          </Label>
                          <Input
                            id="netlifyToken"
                            type="password"
                            value={formData.netlifyAccessToken}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              netlifyAccessToken: e.target.value 
                            })}
                            placeholder="xxxxxxxxxxxxxxxxxx"
                            className="font-mono"
                          />
                          <p className="text-xs text-gray-500">
                            Obtenha em: <a 
                              href="https://app.netlify.com/user/applications#personal-access-tokens" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              app.netlify.com/user/applications
                            </a>
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="netlifySiteId">
                            Site ID (opcional)
                          </Label>
                          <Input
                            id="netlifySiteId"
                            value={formData.netlifySiteId}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              netlifySiteId: e.target.value 
                            })}
                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                            className="font-mono"
                          />
                        </div>
                      </>
                    )}

                    <Alert className="bg-yellow-50 border-yellow-200">
                      <AlertDescription className="text-yellow-800">
                        ⚠️ Integração com Netlify em breve. Por enquanto, use Vercel.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {/* CLOUDFLARE PAGES */}
                {hostingTab === 'cloudflare' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cloudflareToken">
                        API Token *
                      </Label>
                      <Input
                        id="cloudflareToken"
                        type="password"
                        value={formData.cloudflareApiToken}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          cloudflareApiToken: e.target.value 
                        })}
                        placeholder="xxxxxxxxxxxxxxxxxx"
                        className="font-mono"
                      />
                      <p className="text-xs text-gray-500">
                        Obtenha em: <a 
                          href="https://dash.cloudflare.com/profile/api-tokens" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          dash.cloudflare.com/profile/api-tokens
                        </a>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cloudflareAccountId">
                        Account ID *
                      </Label>
                      <Input
                        id="cloudflareAccountId"
                        value={formData.cloudflareAccountId}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          cloudflareAccountId: e.target.value 
                        })}
                        placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="font-mono"
                      />
                    </div>

                    <Alert className="bg-yellow-50 border-yellow-200">
                      <AlertDescription className="text-yellow-800">
                        ⚠️ Integração com Cloudflare Pages em breve. Por enquanto, use Vercel.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </div>

            {/* Provedor Ativo */}
            <div className="space-y-2">
              <Label>Provedor de Deploy Ativo</Label>
              <Select
                value={formData.hostingActiveProvider}
                onValueChange={(value: any) => setFormData({ 
                  ...formData, 
                  hostingActiveProvider: value 
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vercel">▲ Vercel (recomendado)</SelectItem>
                  <SelectItem value="netlify" disabled>◆ Netlify (em breve)</SelectItem>
                  <SelectItem value="cloudflare_pages" disabled>☁️ Cloudflare Pages (em breve)</SelectItem>
                  <SelectItem value="none">❌ Nenhum (sem deploy automático)</SelectItem>
                </SelectContent>
              </Select>
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
  const [archiveFile, setArchiveFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'zip' | 'code'>('zip');
  const [uploadSteps, setUploadSteps] = useState<ClientSiteUploadStep[] | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'verifying' | 'ok' | 'failed'>('idle');
  const [verifyDetails, setVerifyDetails] = useState<string | null>(null);
  
  // ✨ Estado para Vercel Build
  const [useVercelBuild, setUseVercelBuild] = useState(false);
  const [vercelDeploymentId, setVercelDeploymentId] = useState<string | null>(null);
  const [vercelBuildStatus, setVercelBuildStatus] = useState<'idle' | 'building' | 'ready' | 'error'>('idle');
  const [vercelBuildUrl, setVercelBuildUrl] = useState<string | null>(null);

  // Polling do status do build na Vercel
  const pollVercelStatus = async (deploymentId: string) => {
    const maxAttempts = 60;
    let attempts = 0;
    
    const poll = async () => {
      if (attempts >= maxAttempts) {
        setVercelBuildStatus('error');
        toast.error('Timeout: build demorou demais');
        setLoading(false);
        return;
      }
      
      attempts++;
      
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/rendizy-server/client-sites/vercel/status/${deploymentId}`,
          { headers: getEdgeHeaders() }
        );
        const data = await response.json();
        
        if (data.readyState === 'READY') {
          setVercelBuildStatus('ready');
          setVercelBuildUrl(data.url);
          toast.success('🎉 Build concluído! Site pronto.');
          setLoading(false);
          onSuccess();
          return;
        } else if (data.readyState === 'ERROR' || data.readyState === 'CANCELED') {
          setVercelBuildStatus('error');
          toast.error(`Build falhou: ${data.errorMessage || 'Erro desconhecido'}`);
          setLoading(false);
          return;
        }
        
        setTimeout(poll, 5000);
      } catch (error) {
        console.error('Erro ao verificar status:', error);
        setTimeout(poll, 5000);
      }
    };
    
    poll();
  };

  const handleSubmitCode = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/client-sites/${site.organizationId}/upload-code`,
        {
          method: 'POST',
          headers: {
            ...getEdgeHeaders('application/json')
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

  const handleSubmitZip = async () => {
    try {
      if (!archiveFile) {
        toast.error('Selecione um arquivo .zip');
        return;
      }

      setLoading(true);
      setUploadSteps(null);
      setVerifyStatus('idle');
      setVerifyDetails(null);

      // ✨ Se usar Vercel Build, enviar para endpoint diferente
      if (useVercelBuild) {
        setVercelBuildStatus('building');
        toast.info('🚀 Iniciando build na Vercel...');

        const formData = new FormData();
        formData.append('file', archiveFile);
        formData.append('subdomain', site.subdomain);

        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/rendizy-server/client-sites/vercel/build-from-zip`,
          {
            method: 'POST',
            headers: {
              ...getEdgeHeaders()
            },
            body: formData
          }
        );

        const data = await response.json();

        if (!data.success) {
          toast.error(data.error || 'Erro ao iniciar build na Vercel');
          setVercelBuildStatus('error');
          setLoading(false);
          return;
        }

        setVercelDeploymentId(data.deploymentId);
        toast.success(`🔧 Build iniciado! ID: ${data.deploymentId}`);
        
        // Iniciar polling do status
        pollVercelStatus(data.deploymentId);
        return;
      }

      // Fluxo normal: ZIP com dist/
      const formData = new FormData();
      formData.append('file', archiveFile);
      formData.append('source', 'custom');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/client-sites/${site.organizationId}/upload-archive`,
        {
          method: 'POST',
          headers: {
            ...getEdgeHeaders()
          },
          body: formData
        }
      );

      const data = await response.json();

      if (data.success) {
        const parsed = data as UploadArchiveResponse;
        if (Array.isArray(parsed.steps)) setUploadSteps(parsed.steps);
        toast.success(parsed.message || 'Arquivo enviado com sucesso');

        setVerifyStatus('verifying');
        const v = await verifyClientSiteIsServing(site.subdomain);
        if (v.ok) {
          setVerifyStatus('ok');
          toast.success('✅ Publicação verificada.');
          onSuccess();
        } else {
          setVerifyStatus('failed');
          setVerifyDetails(v.details || 'Falha ao verificar publicação');
          toast.error('⚠️ Upload ok, mas a verificação falhou.');
        }
      } else {
        const parsed = data as UploadArchiveResponse;
        if (Array.isArray(parsed.steps)) setUploadSteps(parsed.steps);
        toast.error(parsed.error || 'Erro ao enviar arquivo');
      }
    } catch (error) {
      console.error('Erro ao enviar arquivo:', error);
      toast.error('Erro ao enviar arquivo');
    } finally {
      if (!useVercelBuild) {
        setLoading(false);
      }
    }
  };

  const previewUrl = getVercelPreviewUrl(site.subdomain);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && loading) return;
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Upload Código do Site</DialogTitle>
          <DialogDescription>
            Envie o build compilado (ZIP com dist/) ou cole o código HTML/React
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList>
              <TabsTrigger value="zip">ZIP (dist/)</TabsTrigger>
              <TabsTrigger value="code">Código</TabsTrigger>
            </TabsList>

            <TabsContent value="zip" className="space-y-3">
              {/* Toggle para Vercel Build */}
              <div className="flex items-center justify-between p-4 rounded-lg border-2 border-dashed border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <div>
                    <Label className="text-purple-900 font-medium cursor-pointer" htmlFor="useVercelBuild">
                      Usar Vercel para build automático?
                    </Label>
                    <p className="text-xs text-purple-700 mt-0.5">
                      {useVercelBuild 
                        ? 'Envie o código fonte (do Bolt) - a Vercel compila automaticamente' 
                        : 'Envie ZIP já compilado com pasta dist/'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${!useVercelBuild ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>Não</span>
                  <button
                    id="useVercelBuild"
                    type="button"
                    role="switch"
                    aria-checked={useVercelBuild}
                    onClick={() => setUseVercelBuild(!useVercelBuild)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      useVercelBuild ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        useVercelBuild ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`text-xs ${useVercelBuild ? 'text-purple-900 font-medium' : 'text-gray-400'}`}>Sim</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Arquivo .zip *</Label>
                <Input
                  type="file"
                  accept=".zip"
                  onChange={(e) => setArchiveFile(e.target.files?.[0] || null)}
                />
                <p className="text-sm text-gray-600">
                  {useVercelBuild ? (
                    <>ZIP do <strong>código fonte</strong> (package.json + src/). Baixe direto do Bolt.new.</>
                  ) : (
                    <>O ZIP precisa conter <strong>dist/index.html</strong> (build de produção).</>
                  )}
                </p>
              </div>

              {/* Status do Build Vercel */}
              {useVercelBuild && vercelBuildStatus !== 'idle' && (
                <div className={`p-4 rounded-lg border ${
                  vercelBuildStatus === 'building' ? 'bg-yellow-50 border-yellow-200' :
                  vercelBuildStatus === 'ready' ? 'bg-green-50 border-green-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {vercelBuildStatus === 'building' && (
                        <>
                          <div className="h-4 w-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                          <span className="text-yellow-800 font-medium">Buildando na Vercel...</span>
                        </>
                      )}
                      {vercelBuildStatus === 'ready' && (
                        <>
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-green-800 font-medium">Build concluído!</span>
                        </>
                      )}
                      {vercelBuildStatus === 'error' && (
                        <>
                          <X className="h-4 w-4 text-red-600" />
                          <span className="text-red-800 font-medium">Build falhou</span>
                        </>
                      )}
                    </div>
                    {vercelDeploymentId && (
                      <span className="text-xs text-gray-500">ID: {vercelDeploymentId}</span>
                    )}
                  </div>
                  {vercelBuildUrl && (
                    <Button
                      size="sm"
                      className="mt-2 gap-2"
                      onClick={() => window.open(vercelBuildUrl, '_blank')}
                    >
                      <Globe className="h-4 w-4" />
                      Abrir Site na Vercel
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="code" className="space-y-3">
              <Textarea
                value={siteCode}
                onChange={(e) => setSiteCode(e.target.value)}
                placeholder="Cole o código do site aqui..."
                className="min-h-[400px] font-mono text-sm"
              />
            </TabsContent>
          </Tabs>
          
          {activeTab === 'zip' && !useVercelBuild && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">💡 Dica:</h4>
              <p className="text-sm text-blue-800">
                Para produção, prefira o ZIP (dist/) para servir assets com Content-Type correto.
              </p>
            </div>
          )}

          {activeTab === 'zip' && useVercelBuild && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h4 className="font-medium text-purple-900 mb-2">✨ Build Automático via Vercel:</h4>
              <p className="text-sm text-purple-800">
                1. Baixe o ZIP do Bolt.new (sem precisar rodar build)<br/>
                2. Envie aqui - a Vercel compila automaticamente (~2 min)<br/>
                3. Site fica pronto e publicado
              </p>
            </div>
          )}

          {loading && activeTab === 'zip' && !useVercelBuild && (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertTitle>Publicando site...</AlertTitle>
              <AlertDescription>
                Estamos enviando e processando o ZIP no backend. Não feche este modal.
              </AlertDescription>
            </Alert>
          )}

          {uploadSteps && uploadSteps.length > 0 && !useVercelBuild && (
            <div className="space-y-2">
              <Label className="text-sm">Etapas do processamento</Label>
              <div className="space-y-2">
                {uploadSteps.map((s) => (
                  <div key={`${s.step}-${s.name}`} className="flex items-center justify-between rounded border p-2">
                    <div className="text-sm">{s.step}) {s.name}</div>
                    <Badge variant={stepBadgeVariant(s.status)}>{s.status}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {verifyStatus !== 'idle' && activeTab === 'zip' && !useVercelBuild && (
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertTitle>
                {verifyStatus === 'verifying'
                  ? 'Verificando publicação...'
                  : verifyStatus === 'ok'
                    ? 'Site pronto'
                    : 'Verificação falhou'}
              </AlertTitle>
              <AlertDescription className="space-y-2 mt-2">
                {verifyStatus === 'ok' ? (
                  <div className="space-y-2">
                    <p className="text-sm">Abra o site e, se necessário, faça hard refresh (Ctrl+F5) para ver a versão nova.</p>
                    <div className="flex gap-2">
                      <Button type="button" variant="default" onClick={() => window.open(previewUrl, '_blank')} className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Abrir site
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(previewUrl);
                          toast.success('Link copiado!');
                        }}
                        className="gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copiar link
                      </Button>
                    </div>
                  </div>
                ) : verifyStatus === 'failed' ? (
                  <div className="space-y-2">
                    <p className="text-sm">
                      O upload terminou, mas o site ainda não respondeu como esperado. Isso pode causar “tela branca”.
                      Tente aguardar 20–60s e recarregar.
                    </p>
                    {verifyDetails && (
                      <pre className="text-xs bg-gray-50 border rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap">{verifyDetails}</pre>
                    )}
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          setVerifyStatus('verifying');
                          setVerifyDetails(null);
                          const v = await verifyClientSiteIsServing(site.subdomain);
                          if (v.ok) {
                            setVerifyStatus('ok');
                            toast.success('✅ Publicação verificada.');
                            onSuccess();
                          } else {
                            setVerifyStatus('failed');
                            setVerifyDetails(v.details || 'Falha ao verificar');
                            toast.error('Verificação ainda falhou.');
                          }
                        }}
                        className="gap-2"
                      >
                        Verificar novamente
                      </Button>
                      <Button type="button" variant="outline" onClick={() => window.open(previewUrl + '?v=' + Date.now(), '_blank')} className="gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Abrir com cache-buster
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm">Checando se o site já está acessível…</p>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading || vercelBuildStatus === 'building'}>
            {loading || vercelBuildStatus === 'building' ? 'Aguarde...' : 'Fechar'}
          </Button>
          <Button
            onClick={activeTab === 'zip' ? handleSubmitZip : handleSubmitCode}
            disabled={loading || vercelBuildStatus === 'building' || (activeTab === 'zip' ? !archiveFile : !siteCode)}
          >
            {loading || vercelBuildStatus === 'building' 
              ? (useVercelBuild ? '🔧 Buildando...' : 'Enviando...') 
              : activeTab === 'zip' 
                ? (useVercelBuild ? '🚀 Iniciar Build na Vercel' : 'Enviar ZIP') 
                : 'Enviar Código'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// MODAL: DOCUMENTAÇÃO PROMPT SITES I.A (BOLT, V0, ETC)
// ============================================================
//
// ⚠️ REGRA CANÔNICA (LEIA docs/Rules.md):
// O RENDIZY PROPÕE O PADRÃO. SITES EXTERNOS SEGUEM.
//
// - NUNCA adapte código Rendizy para "aceitar" implementação errada de terceiros
// - Se o site gerado tem bug, corrija o PROMPT abaixo, não o backend
// - O prompt é PROPOSITIVO: dita regras, não sugere
// - Zero tolerância com desvios do contrato
//
// Fluxo correto: Prompt atualizado → Site regenerado → Funciona
// Fluxo ERRADO: Site bugado → Patch no Rendizy → NÃO FAZER!
//
// ============================================================
//
// ╔══════════════════════════════════════════════════════════════╗
// ║  🚨🚨🚨 ATENÇÃO I.A - REGRA OBRIGATÓRIA DE SINCRONIZAÇÃO 🚨🚨🚨  ║
// ╠══════════════════════════════════════════════════════════════╣
// ║                                                              ║
// ║  A VERSÃO É SINGLE SOURCE OF TRUTH em catalog.ts!            ║
// ║                                                              ║
// ║  SEMPRE que atualizar o prompt, você DEVE:                   ║
// ║                                                              ║
// ║  1. Atualizar CATALOG_VERSION em catalog.ts                  ║
// ║     → components/client-sites/catalog.ts                     ║
// ║     → Linha ~47: export const CATALOG_VERSION = 'vX.Y'       ║
// ║                                                              ║
// ║  2. Adicionar nova entrada em PROMPT_VERSIONS (abaixo):      ║
// ║     → A PRIMEIRA entrada deve ter version = CATALOG_VERSION  ║
// ║     → Adicionar changes[] descrevendo o que mudou            ║
// ║     → Mover entrada anterior para "histórico"                ║
// ║                                                              ║
// ║  ⚠️ SE ESQUECER: O badge vai mostrar versão antiga!          ║
// ║                                                              ║
// ╚══════════════════════════════════════════════════════════════╝
//

// ============================================================
// HISTÓRICO DE VERSÕES DO PROMPT
// ============================================================
type PromptVersion = {
  version: string;
  date: string;
  time: string;
  author: string;
  changes: string[];
  prompt: string;
};

// ⚠️ IMPORTANTE: A versão atual é SEMPRE gerada dinamicamente usando CATALOG_VERSION!
// Isso garante que nunca fique dessincronizado.
// As entradas abaixo são apenas o HISTÓRICO (versões antigas).
const PROMPT_HISTORY: Omit<PromptVersion, 'prompt'>[] = [
  {
    version: 'v6.0',
    date: '2026-01-15',
    time: '21:00',
    author: 'Copilot + Rafael',
    changes: [
      '🧱 Catálogo v6.0 sincronizado com prompt gerado',
      '🔄 Prompt passou a depender 100% do catálogo',
      '✅ Consolidação do fluxo de sites (temporada) validada'
    ],
    prompt: `# RENDIZY — PROMPT PLUGÁVEL (v6.0)
Este prompt foi atualizado para v6.1 com seções por modalidade.`,
  },
  // Histórico começa em v5.5 (versões anteriores à atual)
  {
    version: 'v5.5',
    date: '2026-01-14',
    time: '21:45',
    author: 'Copilot + Rafael',
    changes: [
      '📝 Instruções detalhadas para formulário de reserva',
      '⚠️ Lista do que NÃO criar (script injeta automaticamente)',
      '✅ Estrutura HTML obrigatória com wrapper div',
      '🔒 IDs reservados que o Bolt não deve usar',
    ],
    prompt: `# RENDIZY — PROMPT PLUGÁVEL (v5.5)
Este prompt foi atualizado para v5.6.`,
  },
  {
    version: 'v5.4',
    date: '2026-01-14',
    time: '21:30',
    author: 'Copilot + Rafael',
    changes: [
      '📱 Corrigido typo que quebrava script de telefone',
      '⚠️ Instrução para Bolt NÃO criar select de país',
      '✅ Rendizy injeta seletor de país automaticamente',
    ],
    prompt: `# RENDIZY — PROMPT PLUGÁVEL (v5.4)
Este prompt foi atualizado para v5.5.`,
  },
  {
    version: 'v5.3',
    date: '2026-01-14',
    time: '20:45',
    author: 'Copilot + Rafael',
    changes: [
      '🖼️ Limite de tamanho de imagens: máximo 100KB',
      '⚠️ PROIBIDO arquivos .tar.gz, .zip, .sql no ZIP',
      '✅ Instruções para otimizar imagens antes de exportar',
    ],
    prompt: `# RENDIZY — PROMPT PLUGÁVEL (v5.3)
Este prompt foi atualizado para v5.4.`,
  },
  {
    version: 'v5.2',
    date: '2026-01-14',
    time: '20:15',
    author: 'Copilot + Rafael',
    changes: [
      '📁 ESTRUTURA DE ARQUIVOS OBRIGATÓRIA explícita',
      '⚠️ PROIBIDO usar variáveis de ambiente (.env, VITE_*)',
      '⚠️ PROIBIDO placeholders como {{ORG_ID}} ou {{SUBDOMAIN}}',
      '⚠️ PROIBIDO gerar arquivos .md extras (README, INSTRUCOES, etc)',
      '✅ Modelo de src/config/site.ts com subdomain hardcoded',
      '✅ Checklist final mais detalhado (package.json na raiz, etc)',
      '✅ Clarificar que ZIP deve ter código-fonte, não dist/',
    ],
    prompt: `# RENDIZY — PROMPT PLUGÁVEL (v5.2)
Este prompt foi atualizado para v5.3 com limite de tamanho de imagens.`,
  },
  {
    version: 'v5.1',
    date: '2026-01-14',
    time: '14:15',
    author: 'Copilot + Rafael',
    changes: [
      '📋 CHECKLIST DE VALIDAÇÃO obrigatório no início do prompt',
      '✅ Lista de verificação para Checkout V2 (nova aba)',
      '✅ Lista de verificação para Formulário V2 (E.164, autofill, lock)',
      '✅ Lista de verificação para Calendário (API real, não mock)',
      '✅ Lista de componentes obrigatórios explícita',
      '⚠️ Aviso claro: site rejeitado se não seguir checklist',
    ],
    prompt: `# RENDIZY — PROMPT PLUGÁVEL (v5.1)
Este prompt foi atualizado para v5.2 com estrutura de arquivos obrigatória.`,
  },
  {
    version: 'v5.0',
    date: '2026-01-14',
    time: '12:00',
    author: 'Copilot + Rafael',
    changes: [
      '🆕 CHECKOUT V2: Abre em NOVA ABA (window.open)',
      '✅ URLs de retorno apontam para domínio Rendizy (/api/checkout/success)',
      '✅ Confirmação assíncrona via webhook (reserva nasce "pending")',
      '✅ Notificação cross-tab via BroadcastChannel/localStorage',
      '✅ Link "Ver Reserva" direciona para Guest Area com ?focus=',
      '🆕 FORMULÁRIO V2: Telefone E.164 obrigatório (país + número)',
      '✅ Autofill quando hóspede está logado',
      '✅ Lock (readonly) dos campos preenchidos automaticamente',
      '✅ Inputs com name/id canônicos (guestName, guestEmail, guestPhone)',
    ],
    prompt: `# RENDIZY — PROMPT v5.0
Este prompt foi atualizado para v5.1 com checklist de validação obrigatório.`,
  },
  {
    version: 'v4.3',
    date: '2026-01-13',
    time: '17:00',
    author: 'Copilot + Rafael',
    changes: [
      '🏠 Área Interna como CÁPSULA SEPARADA',
      '✅ Cápsula em /guest-area/ servida centralmente',
      '✅ Sites só redirecionam (não têm código embutido)',
      '✅ Um update na cápsula afeta TODOS os sites',
      '✅ CSS Variables para whitelabel (primary/secondary/accent)',
      '✅ Google One Tap integrado na cápsula',
      '✅ Persistência via localStorage',
    ],
    prompt: `# RENDIZY — PROMPT PLUGÁVEL (v4.3)

Este prompt foi substituído pela v5.0 que inclui Checkout v2 (nova aba + webhook).`,
  },
  {
    version: 'v4.2',
    date: '2026-01-13',
    time: '15:30',
    author: 'Copilot + Rafael',
    changes: [
      '🏠 Área Interna do Cliente (Whitelabel)',
      '✅ Endpoint /reservations/mine para listar reservas',
      '✅ Estrutura de componentes: GuestLayout, GuestSidebar, etc.',
      '✅ Menu lateral responsivo com cores do site-config',
      '✅ Página Minhas Reservas com status badges',
      '✅ Countdown para reservas pendentes',
      '✅ Botão "Pagar Agora" para retomar pagamento',
    ],
    prompt: `# RENDIZY — PROMPT v4.2 (Área Interna Embutida)
Este prompt foi substituído pela v4.3 que usa arquitetura de cápsula.`,
  },
  {
    version: 'v3.0',
    date: '2026-01-10',
    time: '16:45',
    author: 'Copilot + Rafael',
    changes: [
      '✅ Checkout Stripe integrado',
      '✅ Endpoint /calculate-price obrigatório',
      '✅ Sistema de pré-reservas com timeout',
      '✅ Correção do campo status (string) no calendário',
      '✅ Anti-patterns de mock documentados',
    ],
    prompt: `# RENDIZY — PROMPT PLUGÁVEL (v3.0)

---
## ⚠️ REGRA FUNDAMENTAL — LEIA PRIMEIRO

**O RENDIZY PROPÕE O PADRÃO. VOCÊ SEGUE.**

Este prompt é PROPOSITIVO, não sugestivo. As especificações aqui são ORDENS, não recomendações.

[... prompt v3.0 completo - disponível no histórico do repositório ...]`,
  },
  {
    version: 'v2.0',
    date: '2026-01-06',
    time: '14:20',
    author: 'Copilot + Rafael',
    changes: [
      '✅ Endpoint /reservations estável',
      '✅ Calendário real via /calendar',
      '✅ Proibição de @supabase/supabase-js',
      '✅ HashRouter obrigatório',
      '✅ Documentação de site-config (beta)',
    ],
    prompt: `# RENDIZY — PROMPT PLUGÁVEL (v2.0)

---
## OBJETIVO
Gerar site SPA de imobiliária integrado ao RENDIZY.

[... prompt v2.0 resumido - disponível no histórico do repositório ...]`,
  },
  {
    version: 'v1.0',
    date: '2025-12-20',
    time: '10:00',
    author: 'Rafael',
    changes: [
      '✅ Versão inicial',
      '✅ Endpoint /properties',
      '✅ DTO ClientSiteProperty',
      '✅ Regras de build (base: "./")',
    ],
    prompt: `# RENDIZY — PROMPT PLUGÁVEL (v1.0)

Prompt inicial para geração de sites via IA.

[... prompt v1.0 resumido - disponível no histórico do repositório ...]`,
  },
];

// ✅ GERAÇÃO AUTOMÁTICA DA VERSÃO ATUAL
// A versão atual é SEMPRE gerada dinamicamente usando CATALOG_VERSION!
// Isso ELIMINA a necessidade de sincronizar manualmente.
const CURRENT_VERSION_ENTRY: PromptVersion = {
  version: CATALOG_VERSION,
  date: CATALOG_UPDATED_AT.split(' ')[0] || new Date().toISOString().split('T')[0],
  time: CATALOG_UPDATED_AT.split(' ')[1] || new Date().toTimeString().slice(0, 5),
  author: 'Copilot + Rafael',
  changes: [
    '✨ Versão gerada automaticamente do catálogo',
    '📋 Veja a aba "Catálogo" para detalhes completos',
    '🔄 Sincronizado com CATALOG_VERSION: ' + CATALOG_VERSION,
  ],
  prompt: 'CURRENT', // placeholder - será substituído pelo prompt gerado
};

// Juntar versão atual + histórico
const PROMPT_VERSIONS: PromptVersion[] = [
  CURRENT_VERSION_ENTRY,
  ...PROMPT_HISTORY.map(h => ({ ...h, prompt: `# RENDIZY — PROMPT (${h.version})\nVersão arquivada. Use a versão atual.` }))
];

function DocsAIModal({ open, onClose }: {
  open: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string>(CATALOG_VERSION);

  // ⚠️ IMPORTANTE: O prompt agora é GERADO AUTOMATICAMENTE a partir do catálogo!
  // Qualquer mudança no catálogo (catalog.ts) reflete automaticamente no prompt.
  // Isso garante que PROMPT e CATÁLOGO estão sempre sincronizados.
  const aiPrompt = generatePromptFromCatalog();

  const currentVersion = PROMPT_VERSIONS.find(v => v.version === selectedVersion);
  // Prompt atual é gerado dinamicamente. Versões antigas usam o prompt salvo.
  // NOTA: CATALOG_VERSION e selectedVersion devem estar sincronizados
  const displayPrompt = selectedVersion === CATALOG_VERSION ? aiPrompt : (currentVersion?.prompt || aiPrompt);

  const catalogBlocks = CLIENT_SITES_BLOCKS_CATALOG.filter((b) => b.stability !== 'deprecated');
  const universalBlocks = catalogBlocks.filter((b) => !b.modalities || b.modalities.includes('universal'));
  const vendaBlocks = catalogBlocks.filter((b) => b.modalities?.includes('venda'));
  const locacaoBlocks = catalogBlocks.filter((b) => b.modalities?.includes('locacao'));

  const getEndpointsForBlocks = (blocks: typeof catalogBlocks, extraIds: string[] = []) => {
    const ids = new Set<string>(extraIds);
    blocks.forEach((b) => b.usesEndpoints.forEach((id) => ids.add(id)));
    return CLIENT_SITES_PUBLIC_CONTRACT_V1.endpoints.filter((e) => ids.has(e.id));
  };

  const universalEndpoints = getEndpointsForBlocks(universalBlocks, ['serve-site']);
  const vendaEndpoints = getEndpointsForBlocks(vendaBlocks);
  const locacaoEndpoints = getEndpointsForBlocks(locacaoBlocks);

  const renderModalityBadges = (modalities?: Array<'universal' | 'venda' | 'locacao'>) => {
    if (!modalities || modalities.includes('universal')) {
      return (
        <Badge variant="secondary" className="text-xs">
          🌐 Universal
        </Badge>
      );
    }

    return (
      <div className="flex flex-wrap gap-1">
        {modalities.includes('locacao') && (
          <Badge variant="secondary" className="text-xs">🏠 Residencial</Badge>
        )}
        {modalities.includes('venda') && (
          <Badge variant="secondary" className="text-xs">🏘️ Venda</Badge>
        )}
      </div>
    );
  };

  const renderBlocks = (blocks: typeof catalogBlocks) => (
    <div className="space-y-2">
      {blocks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-4 text-sm text-gray-500">
            Nenhum componente específico nesta seção.
          </CardContent>
        </Card>
      ) : (
        blocks.map((block) => (
          <Card key={block.id} className="border-l-4 border-l-blue-400">
            <CardHeader className="py-2 px-3">
              <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                  {block.title}
                  <Badge
                    variant={block.stability === 'stable' ? 'default' : 'outline'}
                    className={`text-xs ${block.stability === 'stable' ? 'bg-green-500' : ''}`}
                  >
                    {block.stability === 'stable' ? 'Disponível' : 'Planejado'}
                  </Badge>
                          {renderModalityBadges(block.modalities)}
                </CardTitle>
              </div>
              <CardDescription className="text-xs mt-1">{block.description}</CardDescription>
            </CardHeader>
            <CardContent className="py-2 px-3 pt-0">
              <div className="text-xs space-y-1">
                <div className="flex flex-wrap gap-1">
                  <span className="text-gray-500">Endpoints:</span>
                  {block.usesEndpoints.map((ep) => (
                    <Badge key={ep} variant="secondary" className="text-xs font-mono">{ep}</Badge>
                  ))}
                </div>
                {block.notes && block.notes.length > 0 && block.notes[0] && !block.notes[0].startsWith('#') && (
                  <p className="text-gray-600 italic">{block.notes[0]}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  const renderEndpoints = (endpoints: typeof CLIENT_SITES_PUBLIC_CONTRACT_V1.endpoints) => (
    <div className="space-y-2">
      {endpoints.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-4 text-sm text-gray-500">
            Nenhum endpoint específico nesta seção.
          </CardContent>
        </Card>
      ) : (
        endpoints.map((endpoint) => (
          <Card key={endpoint.id} className="border-l-4 border-l-green-400">
            <CardHeader className="py-2 px-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono">{endpoint.method}</Badge>
                  {endpoint.title}
                  <Badge
                    variant={endpoint.stability === 'stable' ? 'default' : 'outline'}
                    className={`text-xs ${endpoint.stability === 'stable' ? 'bg-green-500' : ''}`}
                  >
                    {endpoint.stability === 'stable' ? 'Estável' : 'Planejado'}
                  </Badge>
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="py-2 px-3 pt-0">
              <code className="text-xs bg-gray-100 px-2 py-1 rounded block mb-2 font-mono">
                {endpoint.pathTemplate}
              </code>
              {endpoint.notes && endpoint.notes.length > 0 && (
                <p className="text-xs text-gray-600">{endpoint.notes[0]}</p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  const copyPrompt = () => {
    navigator.clipboard.writeText(displayPrompt);
    setCopied(true);
    toast.success(`Prompt ${selectedVersion} copiado! Cole no Bolt.new, v0.dev ou Figma Make`);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Documentação para IA — Prompt + Catálogo
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <span>Gere sites profissionais integrados ao RENDIZY usando IA</span>
            <Badge variant="outline" className="ml-2 text-xs">
              Versão {CATALOG_VERSION}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="historico" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="historico" className="gap-2">
              <History className="h-4 w-4" />
              Prompt
            </TabsTrigger>
            <TabsTrigger value="catalogo" className="gap-2">
              <Package className="h-4 w-4" />
              Catálogo
            </TabsTrigger>
            <TabsTrigger value="instrucoes" className="gap-2">
              <FileText className="h-4 w-4" />
              Como Usar
            </TabsTrigger>
          </TabsList>



          {/* TAB: Histórico (agora é a aba principal) */}
          <TabsContent value="historico" className="flex-1 overflow-y-auto mt-4">
            {/* Plataformas - sempre visível no topo */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Button
                variant="outline"
                className="h-auto py-3 flex-col gap-1 border-2 border-purple-200 bg-purple-50 hover:bg-purple-100"
                onClick={() => window.open('https://bolt.new', '_blank')}
              >
                <Sparkles className="h-5 w-5 text-purple-600" />
                <span className="font-semibold">Bolt.new</span>
                <span className="text-xs text-gray-500">Recomendado</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex-col gap-1 border-2 border-blue-200 bg-blue-50 hover:bg-blue-100"
                onClick={() => window.open('https://v0.dev', '_blank')}
              >
                <Code className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">v0.dev</span>
                <span className="text-xs text-gray-500">Vercel</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-3 flex-col gap-1 border-2 border-green-200 bg-green-50 hover:bg-green-100"
                onClick={() => window.open('https://figma.com', '_blank')}
              >
                <Globe className="h-5 w-5 text-green-600" />
                <span className="font-semibold">Figma</span>
                <span className="text-xs text-gray-500">Design First</span>
              </Button>
            </div>

            <div className="space-y-3">
              {PROMPT_VERSIONS.map((v, index) => {
                const isLatest = index === 0;
                const isSelected = selectedVersion === v.version;
                
                return (
                  <Card 
                    key={v.version}
                    className={`cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-2 border-purple-500 shadow-md' 
                        : isLatest
                          ? 'border-2 border-green-300 hover:border-green-400'
                          : 'hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedVersion(v.version)}
                  >
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant={isLatest ? 'default' : 'outline'}
                            className={`font-mono ${isLatest ? 'bg-green-500' : ''}`}
                          >
                            {v.version}
                          </Badge>
                          {isLatest && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                              ATUAL
                            </Badge>
                          )}
                          <div>
                            <p className="text-sm font-medium">{v.date} às {v.time}</p>
                            <p className="text-xs text-gray-500">por {v.author}</p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant={isSelected ? (copied ? 'default' : 'outline') : 'ghost'}
                          onClick={(e) => { e.stopPropagation(); setSelectedVersion(v.version); copyPrompt(); }} 
                          className="gap-2"
                        >
                          {copied && isSelected ? (
                            <>
                              <Check className="h-3 w-3" />
                              Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copiar
                            </>
                          )}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-1">
                        {v.changes.map((change, i) => (
                          <Badge key={i} variant="secondary" className="text-xs font-normal">
                            {change}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          
{/* TAB: Catálogo (NOVO - Blocos + Endpoints) */}
          <TabsContent value="catalogo" className="flex-1 overflow-y-auto mt-4 space-y-4">
            {/* Banner explicativo */}
            <Alert className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <Package className="h-4 w-4 text-purple-600" />
              <AlertTitle className="text-purple-800 flex items-center gap-2">
                Catálogo de Componentes e Dados
                <Badge variant="outline" className="text-xs">{CATALOG_VERSION}</Badge>
              </AlertTitle>
              <AlertDescription className="mt-2 text-purple-700">
                <p className="mb-2">
                  <strong>📋 PROMPT</strong> diz O QUE FAZER e as REGRAS GERAIS<br />
                  <strong>📦 CATÁLOGO</strong> diz COMO FAZER com COMPONENTES ESPECÍFICOS
                </p>
                <p className="text-sm">
                  Os dois são <strong>irmãos siameses</strong> — atualizados juntos, mesma versão.
                  A IA deve ler ambos para implementar corretamente.
                </p>
              </AlertDescription>
            </Alert>

            {/* Seção: Componentes por Modalidade */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <span className="text-xl">🧱</span> Componentes Universais (todas as modalidades)
              </h3>
              {renderBlocks(universalBlocks)}
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <span className="text-xl">🏠</span> Venda de Imóveis (componentes específicos)
              </h3>
              {renderBlocks(vendaBlocks)}
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <span className="text-xl">🏘️</span> Locação Residencial (componentes específicos)
              </h3>
              {renderBlocks(locacaoBlocks)}
            </div>

            {/* Seção: Endpoints por Modalidade */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <span className="text-xl">🔌</span> Endpoints por Modalidade
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2 text-gray-700">Universais</h4>
                  {renderEndpoints(universalEndpoints)}
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2 text-gray-700">Venda de Imóveis</h4>
                  {renderEndpoints(vendaEndpoints)}
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2 text-gray-700">Locação Residencial</h4>
                  {renderEndpoints(locacaoEndpoints)}
                </div>
              </div>
            </div>

            {/* Dica final */}
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertTitle className="text-yellow-800 text-sm">💡 Dica para IA</AlertTitle>
              <AlertDescription className="text-yellow-700 text-xs">
                Ao implementar um site, consulte os blocos acima e use os endpoints listados.
                Cada bloco tem <code>requiredFields</code> que DEVEM ser usados.
                Se tiver dúvida, siga os exemplos de código no catálogo completo.
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* TAB: Instruções */}
          <TabsContent value="instrucoes" className="flex-1 overflow-y-auto mt-4 space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <FileText className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Passo a Passo</AlertTitle>
              <AlertDescription className="mt-3">
                <ol className="list-decimal list-inside space-y-3 text-sm">
                  <li className="text-gray-700">
                    <strong>Copie o prompt</strong> — Na aba "Prompt", clique em "Copiar" na versão mais recente (ATUAL)
                  </li>
                  <li className="text-gray-700">
                    <strong>Abra uma IA</strong> — Acesse Bolt.new, v0.dev, Claude ou ChatGPT
                  </li>
                  <li className="text-gray-700">
                    <strong>Cole o prompt</strong> — Cole o conteúdo completo na IA
                  </li>
                  <li className="text-gray-700">
                    <strong>Aguarde a geração</strong> — A IA vai criar o código do site
                  </li>
                  <li className="text-gray-700">
                    <strong>Baixe o projeto</strong> — Exporte como ZIP ou copie os arquivos
                  </li>
                  <li className="text-gray-700">
                    <strong>Importe no Rendizy</strong> — Use o botão "Importar Site" nesta tela
                  </li>
                </ol>
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">O que o prompt inclui?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Integração completa com API pública do Rendizy</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Listagem de imóveis, calendário, reservas</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Checkout multi-gateway (Stripe + Pagar.me)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Login social com Google One Tap</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Área interna do hóspede (Cápsula Separada)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>HashRouter para compatibilidade com Vercel</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>Cápsula Guest Area: /guest-area/?slug=SUBDOMAIN</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
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
  const initialFormData = {
    organizationId: '',
    siteName: '',
    siteCode: '',
    source: 'bolt', // bolt, v0, figma, custom
    contactEmail: '',
    contactPhone: '',
    shortTerm: true,
    longTerm: false,
    sale: false
  };

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [importTab, setImportTab] = useState<'code' | 'zip' | 'vercel'>('zip');
  const [archiveFile, setArchiveFile] = useState<File | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [createdSubdomain, setCreatedSubdomain] = useState<string | null>(null);
  const [uploadSteps, setUploadSteps] = useState<ClientSiteUploadStep[] | null>(null);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'verifying' | 'ok' | 'failed'>('idle');
  const [verifyDetails, setVerifyDetails] = useState<string | null>(null);
  const [formData, setFormData] = useState(initialFormData);
  
  // Estado para Vercel Build
  const [vercelDeploymentId, setVercelDeploymentId] = useState<string | null>(null);
  const [vercelBuildStatus, setVercelBuildStatus] = useState<'idle' | 'building' | 'ready' | 'error'>('idle');
  const [vercelBuildUrl, setVercelBuildUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(false);
    setStep(1);
    setImportTab('zip');
    setArchiveFile(null);
    setSourceFile(null);
    setCreatedSubdomain(null);
    setUploadSteps(null);
    setVerifyStatus('idle');
    setVercelDeploymentId(null);
    setVercelBuildStatus('idle');
    setVercelBuildUrl(null);
    setVerifyDetails(null);
    setFormData(initialFormData);
  }, [open]);

  const canClose = !loading;

  const openPreviewUrl = (subdomain: string, cacheBust = false) => {
    const base = getVercelPreviewUrl(subdomain);
    const url = cacheBust ? `${base}?v=${Date.now()}` : base;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const copyPreviewUrl = async (subdomain: string, cacheBust = false) => {
    const base = getVercelPreviewUrl(subdomain);
    const url = cacheBust ? `${base}?v=${Date.now()}` : base;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('🔗 Link copiado!');
    } catch {
      toast.error('Não foi possível copiar o link');
    }
  };

  const retryVerify = async () => {
    if (!createdSubdomain) return;
    setVerifyStatus('verifying');
    const v = await verifyClientSiteIsServing(createdSubdomain);
    if (v.ok) {
      setVerifyStatus('ok');
      setVerifyDetails(null);
      toast.success('✅ Publicação verificada.');
    } else {
      setVerifyStatus('failed');
      setVerifyDetails(v.details || 'Falha ao verificar publicação');
      toast.error('⚠️ Verificação falhou.');
    }
  };

  // Polling do status do build na Vercel
  const pollVercelStatus = async (deploymentId: string) => {
    const maxAttempts = 60; // 5 minutos máximo
    let attempts = 0;
    
    const poll = async () => {
      if (attempts >= maxAttempts) {
        setVercelBuildStatus('error');
        toast.error('Timeout: build demorou demais');
        return;
      }
      
      attempts++;
      
      try {
        const response = await fetch(
          `https://${projectId}.supabase.co/functions/v1/rendizy-server/client-sites/vercel/status/${deploymentId}`,
          { headers: getEdgeHeaders() }
        );
        const data = await response.json();
        
        if (data.readyState === 'READY') {
          setVercelBuildStatus('ready');
          setVercelBuildUrl(data.url);
          toast.success('🎉 Build concluído! Site pronto.');
          return;
        } else if (data.readyState === 'ERROR' || data.readyState === 'CANCELED') {
          setVercelBuildStatus('error');
          toast.error(`Build falhou: ${data.errorMessage || 'Erro desconhecido'}`);
          return;
        }
        
        // Continuar polling
        setTimeout(poll, 5000); // 5 segundos
      } catch (error) {
        console.error('Erro ao verificar status:', error);
        setTimeout(poll, 5000);
      }
    };
    
    poll();
  };

  const handleSubmit = async () => {
    if (step === 1) {
      if (!formData.organizationId || !formData.siteName) {
        toast.error('Preencha organização e nome do site');
        return;
      }
      setStep(2);
      return;
    }

    if (importTab === 'code' && !formData.siteCode) {
      toast.error('Cole o código do site');
      return;
    }
    if (importTab === 'zip' && !archiveFile) {
      toast.error('Selecione um arquivo .zip com dist/');
      return;
    }
    if (importTab === 'vercel' && !sourceFile) {
      toast.error('Selecione o arquivo .zip com o código fonte');
      return;
    }

    try {
      setLoading(true);
      setUploadSteps(null);
      setVerifyStatus('idle');
      setVerifyDetails(null);

      // 1. Criar o site
      const createResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/client-sites`,
        {
          method: 'POST',
          headers: {
            ...getEdgeHeaders('application/json')
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

      const subdomain = (createData?.data?.subdomain as string | undefined) || null;
      setCreatedSubdomain(subdomain);

      // 2. Fazer upload do código, ZIP, ou Build via Vercel
      let uploadData: any = null;

      if (importTab === 'vercel') {
        // ✨ Build via Vercel API
        const fd = new FormData();
        fd.append('file', sourceFile as File);
        fd.append('subdomain', subdomain || formData.siteName.toLowerCase().replace(/\s+/g, '-'));

        toast.info('🚀 Iniciando build na Vercel...');
        setVercelBuildStatus('building');

        const buildResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/rendizy-server/client-sites/vercel/build-from-zip`,
          {
            method: 'POST',
            headers: {
              ...getEdgeHeaders()
            },
            body: fd
          }
        );
        
        const buildData = await buildResponse.json();
        
        if (!buildData.success) {
          toast.error(buildData.error || 'Erro ao iniciar build');
          setVercelBuildStatus('error');
          setLoading(false);
          return;
        }

        setVercelDeploymentId(buildData.deploymentId);
        toast.success(`🔧 Build iniciado! ID: ${buildData.deploymentId}`);
        
        // Iniciar polling do status
        pollVercelStatus(buildData.deploymentId);
        
        setLoading(false);
        return;
      } else if (importTab === 'code') {
        const uploadResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/rendizy-server/client-sites/${formData.organizationId}/upload-code`,
          {
            method: 'POST',
            headers: {
              ...getEdgeHeaders('application/json')
            },
            body: JSON.stringify({ siteCode: formData.siteCode })
          }
        );
        uploadData = (await uploadResponse.json()) as UploadArchiveResponse;
      } else {
        // ZIP com dist/
        const fd = new FormData();
        fd.append('file', archiveFile as File);
        fd.append('source', formData.source);

        const uploadResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/rendizy-server/client-sites/${formData.organizationId}/upload-archive`,
          {
            method: 'POST',
            headers: {
              ...getEdgeHeaders()
            },
            body: fd
          }
        );
        uploadData = (await uploadResponse.json()) as UploadArchiveResponse;
      }

      if (Array.isArray((uploadData as any)?.steps)) setUploadSteps((uploadData as any).steps);

      if (uploadData?.success) {
        toast.success(uploadData?.message || '✅ Site importado com sucesso!');

        if (subdomain) {
          setVerifyStatus('verifying');
          const v = await verifyClientSiteIsServing(subdomain);
          if (v.ok) {
            setVerifyStatus('ok');
            toast.success('✅ Publicação verificada. Site pronto para abrir.');
          } else {
            setVerifyStatus('failed');
            setVerifyDetails(v.details || 'Falha ao verificar publicação');
            toast.error('⚠️ Upload ok, mas a verificação falhou. Veja os detalhes no modal.');
          }
        }
      } else {
        toast.error(uploadData?.error || 'Erro ao importar');
      }
    } catch (error) {
      console.error('Erro ao importar site:', error);
      toast.error('Erro ao importar site');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && canClose) {
          onClose();
          return;
        }
        if (!nextOpen && !canClose) {
          toast.message('Aguarde o processamento terminar…');
        }
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Importar Site de IA/Figma
          </DialogTitle>
          <DialogDescription>
            {step === 1 ? 'Configure os dados básicos do site' : 'Envie o ZIP (dist/) ou cole o código gerado pela IA'}
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
              <AlertTitle>Importe o build ou o código</AlertTitle>
              <AlertDescription>
                Você pode colar o código ou enviar um ZIP contendo <strong>dist/index.html</strong>.
              </AlertDescription>
            </Alert>

            {createdSubdomain && (
              <Alert>
                <AlertTitle className="flex items-center justify-between gap-2">
                  <span>
                    Subdomínio criado: <strong>{createdSubdomain}</strong>
                  </span>
                  <Badge variant="secondary">/site/{createdSubdomain}/</Badge>
                </AlertTitle>
                <AlertDescription className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => openPreviewUrl(createdSubdomain)}>
                      Abrir site
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => copyPreviewUrl(createdSubdomain)}>
                      Copiar link
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openPreviewUrl(createdSubdomain, true)}>
                      Abrir com cache-buster
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={retryVerify}
                      disabled={loading || verifyStatus === 'verifying'}
                    >
                      Verificar novamente
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Dica: se você ver "tela branca" ou assets antigos, faça <strong>Ctrl+F5</strong> ou use o
                    botão "cache-buster".
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {(uploadSteps || verifyStatus !== 'idle') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Status do processamento</Label>
                  <Badge
                    variant={
                      verifyStatus === 'ok'
                        ? 'default'
                        : verifyStatus === 'failed'
                          ? 'destructive'
                          : verifyStatus === 'verifying'
                            ? 'secondary'
                            : 'outline'
                    }
                  >
                    {verifyStatus === 'idle'
                      ? 'Aguardando'
                      : verifyStatus === 'verifying'
                        ? 'Verificando'
                        : verifyStatus === 'ok'
                          ? 'Publicado'
                          : 'Falhou'}
                  </Badge>
                </div>

                {Array.isArray(uploadSteps) && uploadSteps.length > 0 && (
                  <div className="space-y-2">
                    {uploadSteps.map((s, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <Badge variant={stepBadgeVariant(s.status)} className="mt-0.5">
                          {s.status}
                        </Badge>
                        <div className="text-sm">
                          <div className="font-medium">
                            {s.step}. {s.name || 'Processando'}
                          </div>
                          {s.message && <div className="text-muted-foreground">{s.message}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {verifyStatus === 'failed' && verifyDetails && (
                  <div className="space-y-2">
                    <Label>Detalhes da verificação</Label>
                    <Textarea value={verifyDetails} readOnly className="min-h-[160px] font-mono text-xs" />
                  </div>
                )}
              </div>
            )}

            <Tabs value={importTab} onValueChange={(v) => setImportTab(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="zip">ZIP (dist/)</TabsTrigger>
                <TabsTrigger value="vercel" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Build Automático
                </TabsTrigger>
                <TabsTrigger value="code">Código</TabsTrigger>
              </TabsList>

              <TabsContent value="code" className="space-y-2">
                <Label>Código do Site</Label>
                <Textarea
                  value={formData.siteCode}
                  onChange={(e) => setFormData({ ...formData, siteCode: e.target.value })}
                  placeholder="Cole o código completo aqui..."
                  className="min-h-[400px] font-mono text-xs"
                />
              </TabsContent>

              <TabsContent value="zip" className="space-y-2">
                <Label>Arquivo .zip</Label>
                <Input
                  type="file"
                  accept=".zip"
                  onChange={(e) => setArchiveFile(e.target.files?.[0] || null)}
                />
                <p className="text-sm text-gray-600">
                  Envie um ZIP com <strong>dist/index.html</strong> (já buildado).
                </p>
              </TabsContent>

              <TabsContent value="vercel" className="space-y-4">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    <span className="font-semibold text-purple-800">Build Automático via Vercel</span>
                  </div>
                  <p className="text-sm text-purple-700">
                    Envie o ZIP do <strong>código fonte</strong> (direto do Bolt.new, sem precisar rodar build).
                    A Vercel vai compilar automaticamente e publicar o site.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Arquivo .zip (código fonte)</Label>
                  <Input
                    type="file"
                    accept=".zip"
                    onChange={(e) => setSourceFile(e.target.files?.[0] || null)}
                  />
                  <p className="text-sm text-gray-600">
                    Baixe o ZIP do Bolt.new e envie aqui. Deve conter <strong>package.json</strong> e <strong>src/</strong>.
                  </p>
                </div>

                {/* Status do Build */}
                {vercelBuildStatus !== 'idle' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Status do Build</Label>
                      <Badge
                        variant={
                          vercelBuildStatus === 'ready'
                            ? 'default'
                            : vercelBuildStatus === 'error'
                              ? 'destructive'
                              : 'secondary'
                        }
                        className={vercelBuildStatus === 'building' ? 'animate-pulse' : ''}
                      >
                        {vercelBuildStatus === 'building' && '🔧 Buildando...'}
                        {vercelBuildStatus === 'ready' && '✅ Pronto!'}
                        {vercelBuildStatus === 'error' && '❌ Erro'}
                      </Badge>
                    </div>
                    
                    {vercelDeploymentId && (
                      <p className="text-xs text-muted-foreground">
                        Deployment ID: {vercelDeploymentId}
                      </p>
                    )}
                    
                    {vercelBuildUrl && (
                      <Button
                        size="sm"
                        onClick={() => window.open(vercelBuildUrl, '_blank')}
                        className="gap-2"
                      >
                        <Globe className="h-4 w-4" />
                        Abrir Site na Vercel
                      </Button>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>✨ O sistema irá:</strong>
                <br />• <strong>ZIP (dist/):</strong> Publicar build estático em /site/&lt;subdomain&gt;/
                <br />• <strong>Build Automático:</strong> Compilar via Vercel e publicar (leva ~2 min)
                <br />• Integrar com a API pública de imóveis (properties)
                <br />• Calendário (disponibilidade + preço por dia): disponível (stable)
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)} disabled={loading || vercelBuildStatus === 'building'}>
              Voltar
            </Button>
          )}
          <Button variant="outline" onClick={onClose} disabled={!canClose || vercelBuildStatus === 'building'}>
            Cancelar
          </Button>
          {step === 2 && (verifyStatus === 'ok' || verifyStatus === 'failed' || vercelBuildStatus === 'ready') ? (
            <Button onClick={onSuccess} disabled={loading}>
              Concluir
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading || vercelBuildStatus === 'building'}>
              {loading ? 'Processando...' : vercelBuildStatus === 'building' ? 'Aguarde o build...' : step === 1 ? 'Próximo' : importTab === 'vercel' ? 'Iniciar Build' : 'Importar Site'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
