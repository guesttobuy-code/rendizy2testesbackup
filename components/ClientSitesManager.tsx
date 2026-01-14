import { useState, useEffect } from 'react';
import { Plus, Globe, Code, Settings, Eye, Trash2, Upload, ExternalLink, Copy, Check, FileText, Sparkles, Download, History, X } from 'lucide-react';
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
// ║  SEMPRE que atualizar PROMPT_VERSIONS abaixo, você DEVE:     ║
// ║                                                              ║
// ║  1. Atualizar CATALOG_VERSION em:                            ║
// ║     → components/client-sites/ClientSitesComponentsAndDataPage.tsx ║
// ║     → Linha ~15: const CATALOG_VERSION = 'vX.Y'              ║
// ║                                                              ║
// ║  2. Se adicionou novo bloco/componente, atualizar catalog.ts:║
// ║     → components/client-sites/catalog.ts                     ║
// ║     → Adicionar novo item no array CATALOG_BLOCKS            ║
// ║                                                              ║
// ║  3. Verificar se aiPrompt (abaixo) reflete a versão correta  ║
// ║                                                              ║
// ║  NUNCA faça commit sem sincronizar essas 3 coisas!           ║
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

const PROMPT_VERSIONS: PromptVersion[] = [
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
    prompt: 'CURRENT', // placeholder - usa o prompt atual
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

function DocsAIModal({ open, onClose }: {
  open: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<string>('v5.1');

  const aiPrompt = `# RENDIZY — PROMPT PLUGÁVEL (v5.1)

> **Catálogo**: v1.2 | **Sistema**: v1.0.104.x | **Atualizado**: 2026-01-14 às 14:15
> **Novidade v5.1**: Checklist de validação obrigatório + Componentes explícitos

---
## ⚠️ REGRA FUNDAMENTAL — LEIA PRIMEIRO

**O RENDIZY PROPÕE O PADRÃO. VOCÊ SEGUE.**

Este prompt é PROPOSITIVO, não sugestivo. As especificações aqui são ORDENS, não recomendações.
- Você DEVE implementar exatamente como especificado.
- Você NÃO pode propor formatos alternativos.
- Você NÃO pode usar convenções próprias que desviem do contrato.
- Se algo não está claro, use o formato EXATO dos exemplos.

O Rendizy **NUNCA** adaptará seu código para "aceitar" implementações diferentes.
Se seu site não funcionar, é porque você desviou do padrão. Corrija seu código.

---

## 📋 CHECKLIST DE VALIDAÇÃO (VERIFIQUE ANTES DE ENTREGAR!)

Antes de gerar o código final, verifique CADA item abaixo. Se algum estiver errado, CORRIJA.

### Checkout v2 (CRÍTICO):
- [ ] Checkout abre em NOVA ABA: ` + "`window.open(checkoutUrl, \"_blank\")`" + ` ← NÃO use ` + "`window.location.href`" + `!
- [ ] successUrl/cancelUrl apontam para domínio Rendizy (` + "`/api/checkout/success`" + `), NÃO para hash routes do site
- [ ] Após criar reserva, implementar listener de BroadcastChannel para confirmação cross-tab

### Formulário de Reserva v2 (CRÍTICO):
- [ ] Campo telefone é OBRIGATÓRIO (não opcional) com dropdown de país (+55, +1, etc)
- [ ] Inputs usam IDs canônicos: ` + "`name=\"guestName\"`" + `, ` + "`name=\"guestEmail\"`" + `, ` + "`name=\"guestPhone\"`" + `
- [ ] Se hóspede logado (` + "`localStorage.rendizy_guest`" + `), campos são preenchidos automaticamente
- [ ] Campos preenchidos via autofill ficam ` + "`readOnly={true} disabled={true}`" + `

### Calendário (CRÍTICO):
- [ ] Calendário usa API real (` + "`/calendar`" + `) — NUNCA dados mock/fake
- [ ] Verificar status com ` + "`day.status === \"available\"`" + ` (string), NÃO ` + "`day.available`" + ` (não existe)

### Componentes Obrigatórios:
- [ ] ` + "`BookingWidget.tsx`" + ` ou ` + "`BookingForm.tsx`" + ` com todas as regras acima
- [ ] ` + "`PaymentMethodSelector.tsx`" + ` com PIX inline (QR code) + Boleto (PDF link)
- [ ] ` + "`DateRangePicker.tsx`" + ` ou ` + "`CalendarPicker.tsx`" + ` usando API real
- [ ] ` + "`GuestAreaButton.tsx`" + ` que redireciona para cápsula (NÃO código embutido)

⚠️ Se você não marcar TODOS os itens acima, o site será rejeitado.

---

## Objetivo (aceitação)
Você vai gerar um site (SPA) de imobiliária (temporada/locação/venda) que, ao ser enviado como ZIP no painel do RENDIZY, fica **funcionando imediatamente** em:
- ` + "`/site/<subdomain>/`" + ` (servido via proxy da Vercel)

Para ser aceito:
- A Home carrega.
- A listagem de imóveis carrega via API pública.
- Assets (JS/CSS/imagens) carregam sem 404.
- Calendário de disponibilidade busca dados da API real (NUNCA mock).

## Stack
- React 18 + TypeScript
- Vite
- Tailwind CSS
- (Opcional) shadcn/ui

## Contexto real do RENDIZY (não invente)

### 1) O site é 100% estático
- Nada de SSR.
- Nada de Node server.
- Nada de chamadas para APIs privadas.

### 2) Restrições de segurança/CSP
- NÃO carregue JS de CDN.
- NÃO use scripts externos.
- Se usar fontes, prefira bundlar local (ou use fontes default do sistema).

### 3) ⚠️ PROIBIDO usar @supabase/supabase-js diretamente
**CRÍTICO**: NÃO instale nem importe ` + "`@supabase/supabase-js`" + `.
O site será servido sem variáveis de ambiente (` + "`VITE_SUPABASE_URL`" + `, etc).
Se você usar ` + "`createClient(...)`" + ` do supabase-js, o bundle vai crashar com:
` + "`" + `Uncaught Error: supabaseUrl is required` + "`" + `

✅ **Forma correta**: use ` + "`fetch()`" + ` diretamente para a API pública (veja seção "Integração de dados").
❌ **Errado**: ` + "`import { createClient } from '@supabase/supabase-js'`" + `

### 4) O site roda em subpath
Ele abre como:
- ` + "`https://<dominio>/site/<subdomain>/`" + `

IMPORTANTE: esse ambiente NÃO garante fallback de rotas para SPA em deep-link (ex: ` + "`/site/<subdomain>/imoveis`" + ` pode quebrar).
Portanto: use **HashRouter**.

✅ Rotas devem ser assim:
- ` + "`/site/<subdomain>/#/`" + `
- ` + "`/site/<subdomain>/#/imoveis`" + `
- ` + "`/site/<subdomain>/#/imovel/<id>`" + `

## Integração de dados (contrato público)

Hoje:
- **Estável**: imóveis (properties)
- **Opcional/Beta**: config pública do site (site-config) — use com fallback

### Endpoint
GET ` + "`https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-public/client-sites/api/:subdomain/properties`" + `

### Endpoint opcional (site-config)
GET ` + "`https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-public/client-sites/api/:subdomain/site-config`" + `

### Resposta

\`\`\`ts
type ClientSiteApiResponse<T> = {
  success: boolean;
  data?: T;
  total?: number;
  error?: string;
  details?: string;
};

type ClientSiteProperty = {
  id: string;
  name: string;
  code: string | null;
  type: string | null;
  status: string | null;
  address: {
    city: string | null;
    state: string | null;
    street: string | null;
    number: string | null;
    neighborhood: string | null;
    zipCode: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  pricing: {
    dailyRate: number;
    basePrice: number;
    weeklyRate: number;
    monthlyRate: number;
    cleaningFee: number;
    serviceFee: number;
    petFee: number;
    minNights: number;
    currency: string;
  };
  capacity: {
    bedrooms: number;
    bathrooms: number;
    maxGuests: number;
    area: number | null;
  };
  description: string;
  shortDescription: string | null;
  photos: string[];
  coverPhoto: string | null;
  tags: string[];
  amenities: string[];
  createdAt: string;
  updatedAt: string;
};

type ClientSiteSiteConfig = {
  organizationId?: string;
  siteName?: string;
  subdomain?: string;
  domain?: string | null;
  theme?: {
    primaryColor?: string | null;
    secondaryColor?: string | null;
    accentColor?: string | null;
    fontFamily?: string | null;
  };
  logo?: string | null;     // URL do logo (pode ser null)
  favicon?: string | null;  // URL do favicon (pode ser null)
  siteConfig?: {
    title?: string;
    description?: string;
    slogan?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    socialMedia?: {
      facebook?: string | null;
      instagram?: string | null;
      whatsapp?: string | null;
    };
  };
  features?: {
    shortTerm?: boolean;
    longTerm?: boolean;
    sale?: boolean;
  };
  updatedAt?: string;
};
\`\`\`

### Como descobrir o subdomain (sem depender de injeção)
Implemente uma função robusta:

\`\`\`ts
function getRendizySubdomain(): string | null {
  // 1) Se existir config (futuro), use.
  const anyWin = window as any;
  const cfgSub = anyWin?.RENDIZY_CONFIG?.SUBDOMAIN;
  if (typeof cfgSub === 'string' && cfgSub.trim()) return cfgSub.trim().toLowerCase();

  // 2) Padrão atual: /site/<subdomain>/...
  const parts = window.location.pathname.split('/').filter(Boolean);
  const siteIdx = parts.findIndex((p) => p.toLowerCase() === 'site');
  if (siteIdx >= 0 && parts[siteIdx + 1]) return parts[siteIdx + 1].toLowerCase();

  // 3) Último fallback: primeiro label do host (se fizer sentido)
  const host = window.location.hostname || '';
  const first = host.split('.')[0];
  return first ? first.toLowerCase() : null;
}
\`\`\`

### Cliente de API (faça assim)

\`\`\`ts
const API_BASE = 'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-public/client-sites/api';

async function fetchProperties(): Promise<ClientSiteApiResponse<ClientSiteProperty[]>> {
  // Se o site estiver sendo servido pelo Rendizy, pode existir helper injetado.
  // Use quando disponível; caso contrário, faça fetch direto.
  const anyWin = window as any;
  if (anyWin?.RENDIZY?.getProperties) {
    try {
      return await anyWin.RENDIZY.getProperties();
    } catch {
      // fallback abaixo
    }
  }

  const sub = getRendizySubdomain();
  if (!sub) return { success: false, error: 'Subdomain não detectado' };

  const url = API_BASE + '/' + encodeURIComponent(sub) + '/properties';
  const r = await fetch(url, { method: 'GET' });
  const json = (await r.json().catch(() => null)) as any;
  if (!json || typeof json.success !== 'boolean') {
    return { success: false, error: 'Resposta inválida da API' };
  }
  return json;
}
\`\`\`

### Cliente de API (site-config) — faça assim (opcional)

\`\`\`ts
async function fetchSiteConfig(): Promise<ClientSiteApiResponse<ClientSiteSiteConfig>> {
  const sub = getRendizySubdomain();
  if (!sub) return { success: false, error: 'Subdomain não detectado' };

  const url = API_BASE + '/' + encodeURIComponent(sub) + '/site-config';
  const r = await fetch(url, { method: 'GET' });
  const json = (await r.json().catch(() => null)) as any;
  if (!json || typeof json.success !== 'boolean') {
    return { success: false, error: 'Resposta inválida da API' };
  }
  return json;
}

// Uso recomendado:
// - Se fetchSiteConfig() falhar, use um fallback local (const SITE_FALLBACK = {...}).
// - Não quebre o site se o endpoint estiver ausente no ambiente.
\`\`\`

## Alinhamento com “Componentes & Dados” (ponto a ponto)
Use como fonte de verdade o catálogo interno em **Edição de Sites → Componentes & Dados**.

### 1) Wrapper (resposta)
- Use exatamente o wrapper ` + "`{ success, data?, total?, error?, details? }`" + `.

### 2) Endpoints
- ` + "`GET /client-sites/api/:subdomain/properties`" + ` = **stable** (use).
- ` + "`GET /client-sites/api/:subdomain/site-config`" + ` = **opcional/beta** (use com fallback local; o site não pode quebrar se não existir).
- ` + "`GET /client-sites/api/:subdomain/calendar?propertyId=UUID&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`" + ` = **stable** (use para calendário de disponibilidade).
- ` + "`GET /client-sites/api/:subdomain/properties/:propertyId/availability?from=YYYY-MM-DD&to=YYYY-MM-DD`" + ` = **stable** (alternativa ao /calendar; mesma funcionalidade).
- ` + "`POST /client-sites/api/:subdomain/reservations`" + ` = **stable** (use para criar reservas; veja seção abaixo).
- ` + "`POST /client-sites/api/:subdomain/calculate-price`" + ` = **stable** (use para calcular preço antes de reservar).
- ` + "`POST /client-sites/api/:subdomain/checkout/session`" + ` = **stable** (cria sessão de pagamento Stripe; requer Stripe configurado).
- Leads = **planned** (não implemente integração real por enquanto).

### 2.0.1) ⚠️ PROIBIDO usar dados mock para calendário
**CRÍTICO**: O calendário de disponibilidade DEVE buscar dados da API real (` + "`/calendar`" + ` ou ` + "`/availability`" + `).
❌ **NUNCA** crie funções que geram bloqueios fake baseados em ` + "`Date.now()`" + ` ou datas hardcoded.
❌ **NUNCA** use arrays estáticos de datas bloqueadas no código.
✅ **SEMPRE** faça ` + "`fetch()`" + ` para o endpoint ` + "`/calendar`" + ` com os parâmetros corretos.

**⚠️ FORMATO DA RESPOSTA DO /calendar (CRÍTICO):**
A API retorna o campo ` + "`status`" + ` como **string**, NÃO como booleano ` + "`available`" + `.

` + "```" + `typescript
// FORMATO REAL DA RESPOSTA:
type CalendarDay = {
  date: string;           // "2026-01-15"
  status: string;         // "available" | "blocked" | "reserved"  ← STRING, não boolean!
  price: number;          // 200
  minNights: number;      // 2
  propertyId: string;     // "uuid"
};

// ❌ ERRADO - NÃO FAÇA ISSO:
if (day.available) { ... }  // available não existe!

// ✅ CORRETO - FAÇA ASSIM:
if (day.status === "available") { ... }
` + "```" + `

**Exemplo correto de cliente para calendário:**
` + "```" + `typescript
async function fetchCalendar(subdomain: string, propertyId: string, startDate: string, endDate: string) {
  const url = API_BASE + '/' + subdomain + '/calendar?' + new URLSearchParams({
    propertyId,
    startDate,
    endDate
  }).toString();
  const res = await fetch(url, { method: 'GET' });
  const json = await res.json();
  // ⚠️ FORMATO DA RESPOSTA (wrapper padrão):
  // json = { success: true, data: { days: [...] } }
  // Onde days = [{ date: 'YYYY-MM-DD', status: 'available'|'blocked'|'reserved', price: number, minNights: number }]
  if (!json.success || !json.data) {
    throw new Error(json.error || 'Erro ao carregar calendário');
  }
  return json.data.days; // Array de CalendarDay
}

// Função para verificar se um range de datas está disponível:
function isRangeAvailable(days: CalendarDay[], startDate: Date, endDate: Date): boolean {
  for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const day = days.find(x => x.date === dateStr);
    // ⚠️ IMPORTANTE: verificar status === "available", NÃO day.available
    if (!day || day.status !== "available") {
      return false;
    }
  }
  return true;
}
` + "```" + `

### 2.1) Endpoint de Reservas (stable)
O endpoint de reservas está estável e pode ser usado para criar reservas reais no sistema.

**Request:**
` + "```" + `
POST /client-sites/api/:subdomain/reservations
Content-Type: application/json

{
  "propertyId": "uuid do imóvel",
  "checkIn": "YYYY-MM-DD",
  "checkOut": "YYYY-MM-DD",
  "guestName": "Nome do hóspede",
  "guestEmail": "email@exemplo.com",  // opcional
  "guestPhone": "+5511999999999",      // opcional
  "guests": 2,                         // opcional, default 1
  "message": "Mensagem opcional"       // opcional
}
` + "```" + `

**Response (201 Created):**
` + "```" + `json
{
  "success": true,
  "data": {
    "id": "uuid da reserva",
    "reservationCode": "WEB-XXXXXXXX-XXX",
    "totalPrice": 600,
    "currency": "BRL",
    "status": "PENDING",
    "message": "Reserva criada! Código: WEB-XXXXXXXX-XXX"
  }
}
` + "```" + `

**Erros comuns:**
- ` + "`400`" + `: Campos obrigatórios faltando (propertyId, checkIn, checkOut, guestName)
- ` + "`400`" + `: Mínimo de noites não atingido (mensagem: "Este período só aceita reservas com no mínimo X noites.")
- ` + "`409`" + `: Datas não disponíveis (conflito com reserva existente ou bloqueio)
- ` + "`404`" + `: Imóvel não encontrado ou não pertence ao site

### 2.2) Endpoint de Cálculo de Preço (stable) — OBRIGATÓRIO usar!
**⚠️ CRÍTICO**: O site DEVE usar este endpoint para calcular e exibir o preço total.
**❌ PROIBIDO** inventar valores de taxa de limpeza, taxa de serviço ou qualquer outro valor.

**Request:**
` + "```" + `
POST /client-sites/api/:subdomain/calculate-price
Content-Type: application/json

{
  "propertyId": "uuid do imóvel",
  "checkIn": "YYYY-MM-DD",
  "checkOut": "YYYY-MM-DD"
}
` + "```" + `

**Response (200 OK):**
` + "```" + `json
{
  "success": true,
  "data": {
    "propertyId": "uuid",
    "checkIn": "2026-02-17",
    "checkOut": "2026-02-19",
    "nights": 2,
    "currency": "BRL",
    "breakdown": {
      "pricePerNight": 200,
      "nightsTotal": 400,
      "cleaningFee": 80,
      "serviceFee": 0
    },
    "total": 480,
    "minNights": 1
  }
}
` + "```" + `

**Erro de minNights (400):**
` + "```" + `json
{
  "success": false,
  "error": "Este período só aceita reservas com no mínimo 2 noites.",
  "minNightsRequired": 2,
  "nightsRequested": 1
}
` + "```" + `

**Exemplo de uso no cliente (exibir breakdown de preço):**
` + "```" + `typescript
async function calculatePrice(subdomain: string, propertyId: string, checkIn: string, checkOut: string) {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://odcgnzfremrqnvtitpcc.supabase.co';
  const url = ` + "`${baseUrl}/functions/v1/rendizy-public/client-sites/api/${subdomain}/calculate-price`" + `;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ propertyId, checkIn, checkOut })
  });
  
  const json = await res.json();
  if (!json.success) {
    // Tratar erro de minNights
    if (json.minNightsRequired) {
      throw new Error(` + "`Este período exige no mínimo ${json.minNightsRequired} noites.`" + `);
    }
    throw new Error(json.error || 'Erro ao calcular preço');
  }
  
  return json.data;
  // Exemplo de exibição:
  // breakdown.pricePerNight × nights = breakdown.nightsTotal
  // + breakdown.cleaningFee (Taxa de limpeza)
  // + breakdown.serviceFee (Taxa de serviço)
  // = total
}
` + "```" + `

### 2.3) Endpoint de Checkout Stripe (stable) — Pagamento integrado
O endpoint de checkout permite criar sessões de pagamento no Stripe após a reserva ser criada.

**Pré-requisitos:**
- Stripe configurado e habilitado no painel (Configurações → Integrações → Stripe)
- Reserva já criada via ` + "`POST /reservations`" + `

**Request:**
` + "```" + `
POST /client-sites/api/:subdomain/checkout/session
Content-Type: application/json

{
  "reservationId": "uuid da reserva criada",
  "successUrl": "https://seusite.com/sucesso",
  "cancelUrl": "https://seusite.com/cancelado"
}
` + "```" + `

**Response (200 OK):**
` + "```" + `json
{
  "success": true,
  "data": {
    "sessionId": "cs_test_xxxxxxxxxxxx",
    "checkoutUrl": "https://checkout.stripe.com/pay/cs_test_xxxx...",
    "amount": 48000,
    "currency": "brl",
    "reservationId": "uuid"
  }
}
` + "```" + `

**Fluxo completo de reserva + pagamento:**
1. ` + "`POST /calculate-price`" + ` → exibe breakdown para o usuário
2. ` + "`POST /reservations`" + ` → cria a reserva (status: pending)
3. ` + "`POST /checkout/session`" + ` → cria sessão no Stripe
4. Redireciona usuário para ` + "`checkoutUrl`" + `
5. Após pagamento, Stripe redireciona para ` + "`successUrl`" + ` ou ` + "`cancelUrl`" + `
6. Webhook atualiza status da reserva automaticamente

**Erros comuns:**
- ` + "`400`" + `: Stripe não configurado ou desabilitado
- ` + "`404`" + `: Reserva não encontrada
- ` + "`404`" + `: Site não encontrado

**Exemplo de uso no cliente:**
` + "```" + `typescript
// IMPORTANTE: Use hash routes (/#/...) para compatibilidade com SPA estático!
async function redirectToCheckout(subdomain: string, reservationId: string) {
  const baseUrl = 'https://odcgnzfremrqnvtitpcc.supabase.co';
  const url = ` + "`${baseUrl}/functions/v1/rendizy-public/client-sites/api/${subdomain}/checkout/session`" + `;
  
  // CERTO: usar window.location.origin + hash route
  // ERRADO: usar /sucesso sem # (causa redirect para outra aplicação)
  const successUrl = window.location.origin + window.location.pathname + '#/reserva/' + reservationId + '/sucesso';
  const cancelUrl = window.location.origin + window.location.pathname + '#/reserva/' + reservationId + '/cancelado';
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reservationId,
      successUrl,
      cancelUrl
    })
  });
  
  const json = await res.json();
  if (!json.success || !json.data?.checkoutUrl) {
    throw new Error(json.error || 'Erro ao criar checkout');
  }
  
  // ⚠️ CHECKOUT V2: Abrir em NOVA ABA, não na mesma aba!
  window.open(json.data.checkoutUrl, "_blank");
}
` + "```" + `

## 🆕 CHECKOUT V2 — REGRAS OBRIGATÓRIAS (v5.0)

### ⚠️ MUDANÇA CRÍTICA: Checkout em Nova Aba

O checkout Stripe DEVE abrir em **NOVA ABA**. A reserva nasce "pending" e só confirma via webhook.

**❌ ERRADO (v4.x - OBSOLETO):**
` + "```" + `typescript
window.location.href = checkoutUrl;  // ❌ NÃO FAÇA ISSO!
window.location.assign(checkoutUrl); // ❌ NÃO FAÇA ISSO!
` + "```" + `

**✅ CORRETO (v5.0):**
` + "```" + `typescript
window.open(checkoutUrl, "_blank");  // ✅ Abre em nova aba
` + "```" + `

### URLs de Retorno (OBRIGATÓRIO)

O successUrl e cancelUrl DEVEM apontar para o domínio Rendizy, NÃO para o site:

` + "```" + `typescript
const RENDIZY_DOMAIN = 'https://rendizy2testesbackup.vercel.app';

const successUrl = RENDIZY_DOMAIN + '/api/checkout/success?' + new URLSearchParams({
  siteSlug: subdomain,
  reservationId: reservationId
}).toString();

const cancelUrl = RENDIZY_DOMAIN + '/api/checkout/cancel?' + new URLSearchParams({
  siteSlug: subdomain,
  reservationId: reservationId
}).toString();
` + "```" + `

**❌ ERRADO:** ` + "`successUrl: '#/pagamento-sucesso'`" + `
**✅ CORRETO:** ` + "`successUrl: 'https://rendizy2testesbackup.vercel.app/api/checkout/success?...'`" + `

### Notificação Cross-Tab (Confirmação)

A aba original deve escutar eventos para saber quando a reserva foi confirmada:

` + "```" + `typescript
useEffect(() => {
  // BroadcastChannel (navegadores modernos)
  const channel = new BroadcastChannel('rendizy-checkout');
  channel.onmessage = (e) => {
    if (e.data?.type === 'checkout-success' && e.data?.reservationId === currentReservationId) {
      showToast('✅ Reserva confirmada!');
      refreshReservations();
    }
  };

  // Fallback: localStorage (Safari, etc)
  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'rendizy_checkout_success') {
      const data = JSON.parse(e.newValue || '{}');
      if (data.reservationId === currentReservationId) {
        showToast('✅ Reserva confirmada!');
        refreshReservations();
      }
    }
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    channel.close();
    window.removeEventListener('storage', handleStorage);
  };
}, [currentReservationId]);
` + "```" + `

### Link "Ver Reserva" (após confirmação)

Após confirmação, direcionar para a Guest Area com foco na reserva:

` + "```" + `typescript
const guestAreaUrl = 'https://rendizy2testesbackup.vercel.app/guest-area/#/reservas?focus=' + reservationId;
` + "```" + `

## 🆕 FORMULÁRIO DE RESERVA v2 — REGRAS (v5.0)

### 1. Telefone Obrigatório com País/Prefixo (E.164)

O campo de telefone DEVE incluir código do país. Formato final: ` + "`+{dialCode}{number}`" + `

` + "```" + `typescript
// UI sugerida: dropdown de país + input de número
<div className="flex gap-2">
  <select name="dialCode" value={dialCode} onChange={e => setDialCode(e.target.value)}>
    <option value="+55">🇧🇷 +55</option>
    <option value="+1">🇺🇸 +1</option>
    <option value="+351">🇵🇹 +351</option>
    {/* ... */}
  </select>
  <input
    type="tel"
    name="guestPhone"
    value={phone}
    onChange={e => setPhone(e.target.value)}
    placeholder="11999999999"
    required
  />
</div>

// Ao submeter, concatenar:
const fullPhone = dialCode + phone.replace(/\\D/g, '');  // +5511999999999

// Validação E.164
function validateE164(phone: string): boolean {
  return /^\\+[1-9]\\d{6,14}$/.test(phone.replace(/\\s/g, ''));
}
` + "```" + `

### 2. Autofill Quando Logado

Se o hóspede estiver logado (token em localStorage), preencher automaticamente:

` + "```" + `typescript
useEffect(() => {
  const guest = JSON.parse(localStorage.getItem('rendizy_guest') || 'null');
  if (guest) {
    setGuestName(guest.name || '');
    setGuestEmail(guest.email || '');
    setGuestPhone(guest.phone || '');
  }
}, []);
` + "```" + `

### 3. Lock Quando Logado (Campos Readonly)

Campos preenchidos automaticamente ficam **readonly/disabled**:

` + "```" + `typescript
const guest = JSON.parse(localStorage.getItem('rendizy_guest') || 'null');
const isLoggedIn = !!guest;

<input
  name="guestName"
  id="guestName"  // ⚠️ IMPORTANTE: usar id canônico
  value={guestName}
  onChange={e => setGuestName(e.target.value)}
  readOnly={isLoggedIn}
  disabled={isLoggedIn}
  className={isLoggedIn ? 'bg-gray-100 cursor-not-allowed' : ''}
/>

{isLoggedIn && (
  <p className="text-xs text-gray-500 mt-1">
    Para editar, acesse seu perfil na <a href="#/area-interna/perfil">Área do Cliente</a>
  </p>
)}
` + "```" + `

### 4. Inputs com name/id Canônicos

O Rendizy injeta script que busca inputs por name/id. Use exatamente:
- ` + "`name=\"guestName\"`" + ` ou ` + "`id=\"guestName\"`" + `
- ` + "`name=\"guestEmail\"`" + ` ou ` + "`id=\"guestEmail\"`" + `
- ` + "`name=\"guestPhone\"`" + ` ou ` + "`id=\"guestPhone\"`" + `

⚠️ Se usar nomes diferentes, o autofill/lock automático não funcionará.

**Exemplo de cliente API:**
` + "```" + `typescript
async function createReservation(subdomain: string, data: {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  guests?: number;
  message?: string;
}) {
  // NÃO USE import.meta.env.VITE_* - use URL fixa hardcoded
  const baseUrl = 'https://odcgnzfremrqnvtitpcc.supabase.co';
  const url = ` + "`${baseUrl}/functions/v1/rendizy-public/client-sites/api/${subdomain}/reservations`" + `;
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erro ao criar reserva');
  }
  
  const json = await res.json();
  // json.data contém: { id, reservationCode, paymentExpiresAt, paymentTimeoutHours, ... }
  return json;
}
` + "```" + `

### 3) DTO de imóveis e grupos de campos
O site deve usar APENAS os campos do ` + "`ClientSiteProperty`" + ` acima, seguindo estes grupos:
- Identidade: ` + "`id, name, code, type, status`" + `
- Endereço: ` + "`address.*`" + `
- Capacidade: ` + "`capacity.*`" + `
- Preço: ` + "`pricing.dailyRate/basePrice/weeklyRate/monthlyRate/cleaningFee/serviceFee/minNights/currency`" + `
- Conteúdo: ` + "`description, shortDescription, photos, coverPhoto, tags, amenities`" + `

REGRAS IMPORTANTES DO CONTRATO:
- Título público do imóvel: sempre use ` + "`property.name`" + ` (não use nomes internos/identificadores do admin).
- Preço diário (temporada): sempre use ` + "`property.pricing.dailyRate`" + ` + ` + "`property.pricing.currency`" + ` (não calcule no front e não busque em campos fora do DTO público).

### 4) Blocos (implemente os STABLE)
Implemente explicitamente estes blocos (mesma intenção do catálogo):
- Header, Hero, Footer
- Listagem: ` + "`properties-grid`" + ` + ` + "`property-card`" + `
- Detalhe: ` + "`property-detail`" + ` + ` + "`property-gallery`" + ` + ` + "`property-amenities`" + `
- Localização/Mapa: ` + "`property-map`" + ` (step 2 do properties)
- CTA de contato (` + "`contact-cta`" + `) usando WhatsApp/link (sem backend)
- Formulário de reserva (` + "`booking-form`" + `): permite criar reservas via POST /reservations
- Pagamento Multi-Gateway (` + "`payment-method-selector`" + `): seletor de método de pagamento (Cartão, PIX, Boleto) que redireciona para o checkout correto

#### Fluxo completo de reserva com pagamento Multi-Gateway:
1. Usuário seleciona datas → ` + "`GET /calendar`" + ` (valida disponibilidade)
2. Submete formulário → ` + "`POST /reservations`" + ` (cria reserva, retorna reservationId)
3. Busca métodos → ` + "`GET /payment-methods`" + ` (lista opções: cartão, pix, boleto)
4. Usuário seleciona método → radio buttons
5. Clica "Pagar" → ` + "`POST /checkout/session`" + ` com ` + "`paymentMethod`" + ` (ex: ` + "`stripe:credit_card`" + ` ou ` + "`pagarme:pix`" + `)
6. Redireciona para checkout ou exibe QR code (PIX) / link boleto

### 2.4) Endpoint de Métodos de Pagamento (stable) — Novo!
Antes de exibir opções de pagamento, o site DEVE chamar este endpoint para saber quais métodos estão disponíveis.

**Request:**
` + "```" + `
GET /client-sites/api/:subdomain/payment-methods
` + "```" + `

**Response (200 OK):**
` + "```" + `json
{
  "success": true,
  "data": {
    "methods": [
      { "id": "stripe:credit_card", "label": "Cartão de Crédito", "gateway": "stripe", "icon": "💳" },
      { "id": "pagarme:pix", "label": "PIX", "gateway": "pagarme", "icon": "📱" },
      { "id": "pagarme:boleto", "label": "Boleto Bancário", "gateway": "pagarme", "icon": "📄" }
    ],
    "gateways": [
      { "id": "stripe", "name": "Stripe", "enabled": true, "priority": 1, "methods": ["credit_card"] },
      { "id": "pagarme", "name": "Pagar.me", "enabled": true, "priority": 2, "methods": ["pix", "boleto"] }
    ],
    "hasPaymentEnabled": true
  }
}
` + "```" + `

**Uso no cliente:**
` + "```" + `typescript
async function fetchPaymentMethods(subdomain: string) {
  const url = ` + "`${API_BASE}/${subdomain}/payment-methods`" + `;
  const res = await fetch(url, { method: 'GET' });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Erro ao buscar métodos');
  return json.data; // { methods, gateways, hasPaymentEnabled }
}
` + "```" + `

### 2.5) Endpoint de Checkout Multi-Gateway (atualizado!)
Agora aceita ` + "`paymentMethod`" + ` para rotear para o gateway correto.

**Request:**
` + "```" + `
POST /client-sites/api/:subdomain/checkout/session
Content-Type: application/json

{
  "reservationId": "uuid da reserva",
  "successUrl": "https://seusite.com/sucesso",
  "cancelUrl": "https://seusite.com/cancelado",
  "paymentMethod": "pagarme:pix"  // NOVO! Formato: gateway:method
}
` + "```" + `

**Response para Stripe (cartão):**
` + "```" + `json
{
  "success": true,
  "data": {
    "sessionId": "cs_test_xxx",
    "checkoutUrl": "https://checkout.stripe.com/...",
    "amount": 48000,
    "currency": "brl",
    "reservationId": "uuid",
    "gateway": "stripe",
    "paymentMethod": "credit_card"
  }
}
` + "```" + `

**Response para Pagar.me (PIX):**
` + "```" + `json
{
  "success": true,
  "data": {
    "orderId": "or_xxx",
    "checkoutUrl": "...",
    "amount": 48000,
    "currency": "brl",
    "reservationId": "uuid",
    "gateway": "pagarme",
    "paymentMethod": "pix",
    "pixQrCode": "00020126...",       // Código copia-e-cola
    "pixQrCodeUrl": "https://..."      // URL da imagem QR
  }
}
` + "```" + `

**Response para Pagar.me (Boleto):**
` + "```" + `json
{
  "success": true,
  "data": {
    "orderId": "or_xxx",
    "checkoutUrl": "...",
    "amount": 48000,
    "currency": "brl",
    "reservationId": "uuid",
    "gateway": "pagarme",
    "paymentMethod": "boleto",
    "boletoUrl": "https://.../boleto.pdf",
    "boletoBarcode": "23793.38128..."
  }
}
` + "```" + `

**Exemplo completo de componente de checkout multi-gateway:**
` + "```" + `typescript
function PaymentMethodSelector({ 
  reservationId, 
  subdomain 
}: { 
  reservationId: string; 
  subdomain: string 
}) {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qrCode: string; qrCodeUrl: string } | null>(null);
  const [boletoData, setBoletoData] = useState<{ url: string; barcode: string } | null>(null);

  // 1) Buscar métodos disponíveis
  useEffect(() => {
    fetchPaymentMethods(subdomain).then(data => {
      if (data.hasPaymentEnabled && data.methods.length > 0) {
        setMethods(data.methods);
        setSelected(data.methods[0].id); // Seleciona primeiro por padrão
      }
    });
  }, [subdomain]);

  // 2) Processar pagamento
  async function handlePay() {
    if (!selected) return;
    setLoading(true);
    
    try {
      const res = await fetch(` + "`${API_BASE}/${subdomain}/checkout/session`" + `, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId,
          // IMPORTANTE: Usar hash routes para SPA estático!
          successUrl: window.location.origin + window.location.pathname + '#/reserva/' + reservationId + '/sucesso',
          cancelUrl: window.location.origin + window.location.pathname + '#/reserva/' + reservationId + '/cancelado',
          paymentMethod: selected  // ex: "stripe:credit_card" ou "pagarme:pix"
        })
      });
      
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      
      const data = json.data;
      
      // 3) Tratamento por tipo de pagamento
      if (data.pixQrCode) {
        // PIX: mostrar QR code inline
        setPixData({ qrCode: data.pixQrCode, qrCodeUrl: data.pixQrCodeUrl });
      } else if (data.boletoUrl) {
        // Boleto: mostrar link e código de barras
        setBoletoData({ url: data.boletoUrl, barcode: data.boletoBarcode });
      } else if (data.checkoutUrl) {
        // Cartão/outros: redirecionar
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      alert(err.message || 'Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  }

  if (methods.length === 0) {
    return <div>Pagamento online não disponível. Entre em contato.</div>;
  }

  // 4) Se já tem dados de PIX ou Boleto, mostrar
  if (pixData) {
    return (
      <div className="space-y-4 text-center">
        <h3 className="text-lg font-bold">Pague via PIX</h3>
        <img src={pixData.qrCodeUrl} alt="QR Code PIX" className="mx-auto w-48 h-48" />
        <div className="text-sm">
          <p>Ou copie o código:</p>
          <input 
            type="text" 
            value={pixData.qrCode} 
            readOnly 
            className="w-full p-2 border rounded text-xs" 
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
        </div>
      </div>
    );
  }

  if (boletoData) {
    return (
      <div className="space-y-4 text-center">
        <h3 className="text-lg font-bold">Boleto Gerado</h3>
        <a 
          href={boletoData.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded"
        >
          📄 Baixar Boleto (PDF)
        </a>
        <div className="text-sm">
          <p>Código de barras:</p>
          <input 
            type="text" 
            value={boletoData.barcode} 
            readOnly 
            className="w-full p-2 border rounded text-xs" 
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
        </div>
      </div>
    );
  }

  // 5) Seletor de método
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Escolha como pagar</h3>
      
      <div className="space-y-2">
        {methods.map(m => (
          <label key={m.id} className="flex items-center gap-3 p-3 border rounded cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="paymentMethod"
              value={m.id}
              checked={selected === m.id}
              onChange={() => setSelected(m.id)}
            />
            <span className="text-xl">{m.icon}</span>
            <span>{m.label}</span>
          </label>
        ))}
      </div>
      
      <button
        onClick={handlePay}
        disabled={loading || !selected}
        className="w-full py-3 bg-green-600 text-white rounded font-bold disabled:opacity-50"
      >
        {loading ? 'Processando...' : 'Pagar Agora'}
      </button>
    </div>
  );
}
` + "```" + `

⚠️ O seletor de métodos só deve aparecer se ` + "`hasPaymentEnabled === true`" + ` (verificar via ` + "`GET /payment-methods`" + `).

Para Header/Hero/Footer:
- Preferir dados vindos de ` + "`site-config`" + ` (título, descrição, contato, redes, features), quando disponível.
- Caso ` + "`site-config`" + ` não exista/falhe, usar fallback local no bundle.

Blocos PLANNED (não dependa): seletor de modalidade, preço por modalidade canônico, leads/booking/quote.

### Regras de UI
- Imagem principal: ` + "`coverPhoto`" + ` (fallback: primeira de ` + "`photos`" + `)
- Localização: ` + "`address.city`" + ` + ` + "`address.state`" + `
- Mapa: usar ` + "`address.latitude`" + ` + ` + "`address.longitude`" + ` quando existir; fallback por cidade/estado (sem expor endereço completo)
- Título do imóvel: ` + "`name`" + `
- Preço: ` + "`pricing.dailyRate`" + ` + ` + "`pricing.currency`" + `

## Páginas (mínimo para ficar "funcionando")
1) Home
- Hero + CTA
- Grid com 6 imóveis (se existir)

2) Imóveis
- Listagem completa
- Filtros somente no front (cidade, hóspedes, tipo)

3) Detalhe do imóvel
- Galeria (usar photos)
- Informações e CTA de contato (WhatsApp)
- Mapa/Localização (step 2): usar latitude/longitude quando disponível; fallback por cidade/estado
- Formulário de Reserva (` + "`booking-form`" + `):
  - Campos: check-in (date), check-out (date), nome do hóspede (text obrigatório), email (email opcional), telefone (tel opcional), número de hóspedes (number), mensagem (textarea opcional)
  - Ao submeter: POST para ` + "`/client-sites/api/:subdomain/reservations`" + `
  - Mostrar sucesso: "Reserva criada! Código: {reservationCode}"
  - Mostrar erro: mensagem do backend ou "Erro ao criar reserva"
  - Calcular preço total no front: (checkOut - checkIn) * pricing.dailyRate

4) Contato

## 🏠 Área Interna do Cliente (CÁPSULA SEPARADA)

### ⚠️ IMPORTANTE: ARQUITETURA CÁPSULA

A Área Interna é uma **aplicação separada** servida centralmente em:
\` + "\`\`\`" + \`
https://rendizy2testesbackup.vercel.app/guest-area/
\` + "\`\`\`" + \`

**NÃO** crie código da área interna dentro do site do cliente!
O site deve apenas **redirecionar** para a cápsula.

### Como Integrar no Site

Crie um botão que redireciona para a cápsula, passando as cores do tema via URL:

\` + "\`\`\`" + \`typescript
// Constante da URL da cápsula
const GUEST_AREA_URL = 'https://rendizy2testesbackup.vercel.app/guest-area/';

// Componente do botão
function GuestAreaButton() {
  const siteConfig = useRendizySiteConfig();
  
  const handleClick = () => {
    const params = new URLSearchParams({
      slug: getRendizySubdomain() || '',
      primary: encodeURIComponent(siteConfig?.theme?.primaryColor || '#3B82F6'),
      secondary: encodeURIComponent(siteConfig?.theme?.secondaryColor || '#10B981'),
      accent: encodeURIComponent(siteConfig?.theme?.accentColor || '#F59E0B'),
    });
    
    window.location.href = GUEST_AREA_URL + '?' + params.toString();
  };
  
  return (
    <button onClick={handleClick} className="btn-secondary">
      👤 Área do Cliente
    </button>
  );
}
\` + "\`\`\`" + \`

### Onde Colocar o Botão

O botão de "Área do Cliente" deve estar no **header/navbar** do site, próximo ao menu:

\` + "\`\`\`" + \`typescript
function Header() {
  return (
    <header className="fixed top-0 w-full bg-white shadow z-50">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Logo />
        <nav className="hidden md:flex gap-4">
          <a href="#home">Início</a>
          <a href="#imoveis">Imóveis</a>
          <a href="#contato">Contato</a>
        </nav>
        <div className="flex items-center gap-3">
          <GuestAreaButton /> {/* ← ADICIONAR AQUI */}
          <WhatsAppButton />
        </div>
      </div>
    </header>
  );
}
\` + "\`\`\`" + \`

### Por que Cápsula?

1. ✅ **Um update afeta TODOS os sites** - Correções automáticas
2. ✅ **Bundle menor** - Site não carrega código da área interna
3. ✅ **Manutenção centralizada** - Não precisa atualizar cada site
4. ✅ **Versionamento** - Pode testar novas versões sem afetar produção

### ⛔ O que NÃO fazer

- ❌ NÃO crie componentes GuestLayout, GuestSidebar dentro do site
- ❌ NÃO crie rotas #/area-interna/* no site
- ❌ NÃO implemente login/logout no site
- ❌ NÃO chame endpoints /auth/guest/* do site

### ✅ O que FAZER

- ✅ Criar botão que redireciona para a cápsula
- ✅ Passar cores do tema via URL params
- ✅ Passar slug do site via URL param
- ✅ Colocar botão no header do site

### Referência: Login e Autenticação

O login está **100% implementado na cápsula**. O site NÃO precisa de código de autenticação.

A cápsula usa:
- Google One Tap para login rápido
- JWT armazenado em localStorage
- Endpoint \` + "\`/auth/guest/google\`" + \` para autenticação

### Endpoints de API da Cápsula (referência)
- POST \` + "\`/client-sites/api/:subdomain/auth/guest/google\`" + \`: Login via Google
- GET \` + "\`/client-sites/api/:subdomain/auth/guest/me\`" + \`: Dados do hóspede
- GET \` + "\`/reservations/mine\`" + \`: Lista reservas do hóspede (com x-site-slug header)

### 📋 Página Minhas Reservas (MyReservationsPage)
\` + "\`\`\`" + \`typescript
function MyReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const subdomain = window.RENDIZY_CONFIG?.SUBDOMAIN || 'medhome';

  useEffect(() => {
    const token = localStorage.getItem('rendizy_guest_token');
    if (!token) {
      window.location.hash = '#/login';
      return;
    }

    fetch(API_BASE + '/' + subdomain + '/reservations/mine', {
      headers: { 'Authorization': 'Bearer ' + token }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setReservations(data.data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="animate-pulse">Carregando...</div>;
  if (!reservations.length) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🏠</div>
        <h2 className="text-xl font-semibold mb-2">Nenhuma reserva ainda</h2>
        <p className="text-gray-500 mb-4">Explore nossos imóveis e faça sua primeira reserva!</p>
        <a href="#/imoveis" className="inline-block px-6 py-3 bg-primary text-white rounded-lg">
          Ver Imóveis
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold mb-6">Minhas Reservas</h1>
      {reservations.map(r => (
        <div key={r.id} className="bg-white rounded-lg shadow p-4 flex gap-4">
          <img src={r.property.coverPhoto} alt={r.property.name} className="w-24 h-24 object-cover rounded-lg" />
          <div className="flex-1">
            <h3 className="font-semibold">{r.property.name}</h3>
            <p className="text-sm text-gray-500">{r.property.city}, {r.property.state}</p>
            <p className="text-sm">📅 {r.checkIn} → {r.checkOut}</p>
            <p className="text-sm">👥 {r.guests} hóspede(s)</p>
          </div>
          <div className="text-right">
            <ReservationStatusBadge status={r.status} paymentStatus={r.paymentStatus} />
            <p className="text-lg font-bold mt-2">R$ {r.totalPrice.toFixed(2)}</p>
            {r.paymentStatus === 'pending' && r.paymentExpiresAt && (
              <PaymentCountdown expiresAt={r.paymentExpiresAt} reservationId={r.id} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReservationStatusBadge({ status, paymentStatus }) {
  const badges = {
    'pending-pending': { label: 'Aguardando Pagamento', color: 'bg-yellow-100 text-yellow-800' },
    'pending-expired': { label: 'Expirada', color: 'bg-red-100 text-red-800' },
    'confirmed-paid': { label: 'Confirmada', color: 'bg-green-100 text-green-800' },
    'cancelled': { label: 'Cancelada', color: 'bg-gray-100 text-gray-800' },
    'completed-paid': { label: 'Concluída', color: 'bg-blue-100 text-blue-800' },
  };
  const key = status === 'cancelled' ? 'cancelled' : \` + "\`" + \`\${status}-\${paymentStatus}\` + "\`" + \`;
  const badge = badges[key] || { label: status, color: 'bg-gray-100' };
  
  return <span className={\` + "\`" + \`px-2 py-1 rounded-full text-xs font-medium \${badge.color}\` + "\`" + \`}>{badge.label}</span>;
}

function PaymentCountdown({ expiresAt, reservationId }) {
  const [remaining, setRemaining] = useState('');
  
  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Expirado'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(\` + "\`" + \`\${h}:\${m.toString().padStart(2,'0')}:\${s.toString().padStart(2,'0')}\` + "\`" + \`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <div className="mt-2">
      <p className="text-xs text-orange-600">⏱️ Pague em {remaining}</p>
      <a href={\` + "\`" + \`#/checkout?reservationId=\${reservationId}\` + "\`" + \`} 
         className="inline-block mt-1 px-3 py-1 bg-orange-500 text-white text-sm rounded">
        Pagar Agora
      </a>
    </div>
  );
}
\` + "\`\`\`" + \`

## ⛔ Anti-patterns (NÃO FAÇA ISSO)
1. **NÃO use @supabase/supabase-js** — causa crash ` + "`supabaseUrl is required`" + `
2. **NÃO use import.meta.env.VITE_*** em runtime — variáveis não existem no bundle servido
3. **NÃO use BrowserRouter** — deep-links quebram; use HashRouter
4. **NÃO referencie assets com path absoluto** (` + "`/images/...`" + `) — use relative
5. **NÃO dependa de SSR/Node** — o site é 100% estático
6. **NÃO carregue scripts de CDN externos** — CSP bloqueia (EXCEÇÃO: ` + "`https://accounts.google.com/gsi/client`" + ` é permitido)
7. **NÃO use dados mock para calendário** — ` + "`Date.now() + X dias`" + ` ou arrays hardcoded de bloqueios são PROIBIDOS. Use a API ` + "`/calendar`" + ` real.
8. **NÃO use useNavigate() em páginas de resultado de pagamento** — SEMPRE falha após redirect externo; use ` + "`window.location.hash`" + ` ou ` + "`<a href>`" + `
9. **NÃO use onClick={() => navigate('/')}** em páginas de sucesso/cancelamento — o navigate não funciona após retorno do gateway de pagamento

## 📍 Páginas de Resultado de Pagamento (CRÍTICO)

⚠️ **ATENÇÃO MÁXIMA**: Esta seção é OBRIGATÓRIA. Erros aqui quebram o fluxo do usuário após pagamento.

Após o checkout, o gateway (Stripe/Pagar.me) redireciona para ` + "`successUrl`" + ` ou ` + "`cancelUrl`" + `.
Você DEVE criar as rotas:
- ` + "`#/pagamento-sucesso`" + ` ou ` + "`#/reserva/:id/sucesso`" + `
- ` + "`#/pagamento-cancelado`" + ` ou ` + "`#/reserva/:id/cancelado`" + `

### ⚠️ REGRA CRÍTICA: Botão "Voltar para Home"

O hook ` + "`useNavigate()`" + ` do React Router **SEMPRE FALHA** nessas páginas porque:
1. O usuário veio de redirect externo (Stripe/Pagar.me)
2. O estado do router não está inicializado corretamente após redirect cross-origin
3. A função ` + "`navigate`" + ` retorna ` + "`undefined`" + ` ou quebra silenciosamente

**❌ ERRADO (NUNCA FAÇA ISSO):**
` + "```" + `typescript
// ❌ QUEBRA 100% DAS VEZES! navigate é undefined após redirect externo
const navigate = useNavigate();
<button onClick={() => navigate('/')}>Voltar</button>

// ❌ TAMBÉM ERRADO - mesmo problema:
<button onClick={() => navigate(-1)}>Voltar</button>
` + "```" + `

**✅ CORRETO (USE SEMPRE):**
` + "```" + `typescript
// ✅ SEMPRE funciona, independente do estado do router
<button onClick={() => window.location.hash = '#/'}>Voltar para Home</button>

// ✅ OU usar link direto (PREFERIDO)
<a href="#/">Voltar para Home</a>

// ✅ Para navegar para outra página:
<a href="#/imoveis">Ver Imóveis</a>
` + "```" + `

### Exemplo de Página de Sucesso:
` + "```" + `typescript
function PaymentSuccessPage() {
  const [reservationId, setReservationId] = useState<string | null>(null);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('reservationId');
    if (id) setReservationId(id);
  }, []);

  return (
    <div className="text-center py-16">
      <div className="text-6xl mb-4">✅</div>
      <h1 className="text-3xl font-bold mb-4">Pagamento Confirmado!</h1>
      <p className="text-gray-600 mb-8">
        Sua reserva foi confirmada. Você receberá um e-mail com os detalhes.
      </p>
      {reservationId && (
        <p className="text-sm text-gray-500 mb-4">Código: {reservationId}</p>
      )}
      {/* ✅ CORRETO: usar href ou window.location.hash */}
      <a 
        href="#/" 
        className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90"
      >
        Voltar para Home
      </a>
    </div>
  );
}
` + "```" + `

### ❌ EXEMPLO DE CÓDIGO ERRADO (NUNCA FAÇA ISSO):
` + "```" + `typescript
// ❌ ERRADO: Função que gera bloqueios FAKE baseados em Date.now()
function getMockBlockedDates() {
  const today = new Date();
  return [
    new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000),  // +2 dias
    new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),  // +3 dias
    new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000), // +10 dias
  ];
}

// ❌ ERRADO: Array estático de datas bloqueadas
const BLOCKED_DATES = ['2026-01-10', '2026-01-11', '2026-01-15'];

// ❌ ERRADO: Função que retorna dados fake
async function getAvailability(propertyId, start, end) {
  return { success: true, data: getMockBlockedDates() }; // FAKE!
}
` + "```" + `

### ✅ EXEMPLO DE CÓDIGO CORRETO (FAÇA ASSIM):
` + "```" + `typescript
// ✅ CORRETO: Busca dados REAIS da API
async function fetchCalendar(subdomain: string, propertyId: string, startDate: string, endDate: string) {
  const API_BASE = 'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-public/client-sites/api';
  const url = API_BASE + '/' + subdomain + '/calendar?' + new URLSearchParams({
    propertyId,
    startDate,
    endDate
  }).toString();
  
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error('Erro ao buscar calendário');
  
  const json = await res.json();
  // json = { success: true, days: [{ date: '2026-01-05', status: 'available', price: 350, minNights: 2 }, ...] }
  return json;
}

// ✅ CORRETO: Componente de calendário que usa API real
function PropertyCalendar({ propertyId }: { propertyId: string }) {
  const [days, setDays] = useState<Array<{ date: string; status: string; price: number }>>([]);
  const [loading, setLoading] = useState(true);
  const subdomain = getRendizySubdomain();

  useEffect(() => {
    if (!subdomain || !propertyId) return;
    
    const start = new Date().toISOString().split('T')[0];
    const end = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    fetchCalendar(subdomain, propertyId, start, end)
      .then(res => {
        if (res.success && res.days) setDays(res.days);
      })
      .finally(() => setLoading(false));
  }, [subdomain, propertyId]);

  if (loading) return <div>Carregando calendário...</div>;

  return (
    <div className="grid grid-cols-7 gap-1">
      {days.map(day => (
        <div 
          key={day.date}
          className={\`p-2 text-center rounded \${
            day.status === 'available' ? 'bg-green-100' :
            day.status === 'reserved' ? 'bg-red-100' : 'bg-gray-100'
          }\`}
        >
          <div className="text-xs">{day.date.split('-')[2]}</div>
          {day.status === 'available' && <div className="text-xs font-bold">R$ {day.price}</div>}
        </div>
      ))}
    </div>
  );
}
` + "```" + `

## 💡 Dicas de Robustez

### Preço: fallback para basePrice
` + "```" + `typescript
// O backend pode retornar dailyRate = 0 em alguns casos
// Sempre use fallback:
const price = property.pricing.dailyRate || property.pricing.basePrice || 0;
` + "```" + `

### Fotos: URLs podem ser relativas
` + "```" + `typescript
// Algumas fotos podem vir sem domínio completo
function resolvePhotoUrl(url: string | null): string {
  if (!url) return '/placeholder.jpg';
  if (url.startsWith('http')) return url;
  // Se for path relativo, adicionar base do Supabase Storage
  return 'https://odcgnzfremrqnvtitpcc.supabase.co/storage/v1/object/public/' + url;
}
` + "```" + `

### Amenities: tradução/mapeamento
` + "```" + `typescript
// Amenities podem vir em português ou inglês
const AMENITY_ICONS: Record<string, string> = {
  'wifi': '📶', 'Wifi': '📶', 'Wi-Fi': '📶',
  'pool': '🏊', 'piscina': '🏊', 'Piscina': '🏊',
  'parking': '🅿️', 'estacionamento': '🅿️', 'Estacionamento': '🅿️',
  'air_conditioning': '❄️', 'ar_condicionado': '❄️', 'Ar condicionado': '❄️',
  // ... adicione mais conforme necessário
};

function getAmenityIcon(amenity: string): string {
  return AMENITY_ICONS[amenity] || '✓';
}
` + "```" + `

## Build / Entrega (OBRIGATÓRIO)
Você deve entregar um ZIP que contenha ` + "`dist/`" + ` na raiz do ZIP e dentro:
- ` + "`dist/index.html`" + `
- ` + "`dist/assets/*`" + `

Regras:
- Em Vite, configure ` + "`base: './'`" + `.
- Não referencie imagens como ` + "`/images/...`" + ` ou ` + "`/foo.png`" + ` (root). Coloque tudo em ` + "`src/assets`" + ` para ir para ` + "`dist/assets`" + `.
- Não inclua ` + "`node_modules`" + ` no ZIP.
- Evite gerar mais de 2000 arquivos no build.

## Checklist final (antes de entregar)
- Rodar ` + "`npm run build`" + `.
- Validar que abrir ` + "`dist/index.html`" + ` local não quebra (mesmo sem subdomain detectado, mostrar erro amigável).
- Validar que com URL ` + "`/site/<subdomain>/`" + ` o app detecta subdomain e lista imóveis.

Gere o projeto completo e pronto para ZIP seguindo TUDO acima.`;

  const currentVersion = PROMPT_VERSIONS.find(v => v.version === selectedVersion);
  // v5.0 é o atual - usa aiPrompt. Outras versões usam o prompt salvo no histórico
  const displayPrompt = selectedVersion === 'v5.0' ? aiPrompt : (currentVersion?.prompt || aiPrompt);

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
            Documentação prompt sites I.A
          </DialogTitle>
          <DialogDescription>
            Gere sites profissionais integrados ao RENDIZY usando IA
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="historico" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="historico" className="gap-2">
              <History className="h-4 w-4" />
              Versões do Prompt
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

          {/* TAB: Instruções */}
          <TabsContent value="instrucoes" className="flex-1 overflow-y-auto mt-4 space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <FileText className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Passo a Passo</AlertTitle>
              <AlertDescription className="mt-3">
                <ol className="list-decimal list-inside space-y-3 text-sm">
                  <li className="text-gray-700">
                    <strong>Copie o prompt</strong> — Na aba "Versões do Prompt", clique em "Copiar" na versão mais recente (ATUAL)
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
