import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Building2,
  Key,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  Globe,
  Info,
  RefreshCw,
  Database,
  Search,
  Download,
  Calendar,
  Upload,
  Users,
  Home,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface StaysNetConfig {
  apiKey: string;
  apiSecret?: string; // Senha / Secret (opcional)
  baseUrl: string;
  accountName?: string; // Nome da conta (ex: "Sua Casa Rende Mais")
  notificationWebhookUrl?: string; // Link de notificações
  scope?: 'global' | 'individual'; // Global ou Individual
  enabled: boolean;
  lastSync?: string;
}

interface ApiEndpoint {
  id: string;
  name: string;
  method: 'GET' | 'POST';
  endpoint: string;
  description: string;
  category: 'properties' | 'reservations' | 'rates' | 'availability' | 'guests';
}

interface ApiResponse {
  endpoint: string;
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
}

const API_ENDPOINTS: ApiEndpoint[] = [
  // PROPERTIES
  {
    id: 'properties-list',
    name: 'Listar Propriedades',
    method: 'GET',
    endpoint: '/properties',
    description: 'Lista todas as propriedades disponíveis',
    category: 'properties',
  },
  {
    id: 'properties-detail',
    name: 'Detalhes da Propriedade',
    method: 'GET',
    endpoint: '/properties/{id}',
    description: 'Retorna detalhes de uma propriedade específica',
    category: 'properties',
  },
  {
    id: 'properties-amenities',
    name: 'Amenidades',
    method: 'GET',
    endpoint: '/properties/{id}/amenities',
    description: 'Lista amenidades da propriedade',
    category: 'properties',
  },
  
  // RESERVATIONS
  {
    id: 'reservations-list',
    name: 'Listar Reservas',
    method: 'GET',
    endpoint: '/reservations',
    description: 'Lista todas as reservas',
    category: 'reservations',
  },
  {
    id: 'reservations-detail',
    name: 'Detalhes da Reserva',
    method: 'GET',
    endpoint: '/reservations/{id}',
    description: 'Retorna detalhes de uma reserva específica',
    category: 'reservations',
  },
  {
    id: 'reservations-create',
    name: 'Criar Reserva',
    method: 'POST',
    endpoint: '/reservations',
    description: 'Cria uma nova reserva',
    category: 'reservations',
  },
  
  // RATES
  {
    id: 'rates-list',
    name: 'Listar Tarifas',
    method: 'GET',
    endpoint: '/rates',
    description: 'Lista todas as tarifas',
    category: 'rates',
  },
  {
    id: 'rates-calendar',
    name: 'Calendário de Tarifas',
    method: 'GET',
    endpoint: '/rates/calendar',
    description: 'Retorna calendário de tarifas',
    category: 'rates',
  },
  
  // AVAILABILITY
  {
    id: 'availability-check',
    name: 'Verificar Disponibilidade',
    method: 'GET',
    endpoint: '/availability',
    description: 'Verifica disponibilidade de propriedades',
    category: 'availability',
  },
  {
    id: 'availability-calendar',
    name: 'Calendário de Disponibilidade',
    method: 'GET',
    endpoint: '/availability/calendar',
    description: 'Retorna calendário de disponibilidade',
    category: 'availability',
  },
  
  // GUESTS
  {
    id: 'guests-list',
    name: 'Listar Hóspedes',
    method: 'GET',
    endpoint: '/guests',
    description: 'Lista todos os hóspedes',
    category: 'guests',
  },
  {
    id: 'guests-detail',
    name: 'Detalhes do Hóspede',
    method: 'GET',
    endpoint: '/guests/{id}',
    description: 'Retorna detalhes de um hóspede específico',
    category: 'guests',
  },
];

const CATEGORY_INFO = {
  properties: { label: 'Propriedades', color: 'blue', icon: Building2 },
  reservations: { label: 'Reservas', color: 'green', icon: CheckCircle2 },
  rates: { label: 'Tarifas', color: 'purple', icon: Database },
  availability: { label: 'Disponibilidade', color: 'orange', icon: Search },
  guests: { label: 'Hóspedes', color: 'pink', icon: Globe },
};

export default function StaysNetIntegration() {
  const [config, setConfig] = useState<StaysNetConfig>({
    apiKey: '',
    baseUrl: 'https://stays.net/external-api',
    accountName: '',
    notificationWebhookUrl: '',
    scope: 'global',
    enabled: false,
  });
  
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [apiResponses, setApiResponses] = useState<Map<string, ApiResponse>>(new Map());
  const [isLoadingEndpoint, setIsLoadingEndpoint] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // 🎯 Estados para Importação
  const [isImporting, setIsImporting] = useState(false);
  const [importType, setImportType] = useState<'all' | 'properties' | 'reservations' | 'guests' | null>(null);
  const [importStats, setImportStats] = useState<any>(null);
  const [importError, setImportError] = useState<string | null>(null);
  
  // 🎯 Validação inteligente da URL
  const validateBaseUrl = (url: string): { 
    isValid: boolean; 
    hasExternalV1: boolean; 
    suggestion?: string;
    status: 'correct' | 'fixable' | 'invalid';
  } => {
    if (!url || !url.trim()) {
      return { isValid: false, hasExternalV1: false, status: 'invalid' };
    }
    
    const trimmedUrl = url.trim();
    const hasExternalV1 = trimmedUrl.endsWith('/external/v1');
    const isHttps = trimmedUrl.startsWith('https://');
    const isStaysNetDomain = trimmedUrl.includes('stays.net');
    
    let suggestion: string | undefined;
    let status: 'correct' | 'fixable' | 'invalid' = 'invalid';
    
    // Se não tem /external/v1, mas é um domínio stays.net válido
    if (!hasExternalV1 && isHttps && isStaysNetDomain) {
      suggestion = trimmedUrl.replace(/\/$/, '') + '/external/v1';
      status = 'fixable';
    } else if (hasExternalV1 && isHttps && isStaysNetDomain) {
      status = 'correct';
    }
    
    return {
      isValid: isHttps && isStaysNetDomain && hasExternalV1,
      hasExternalV1,
      suggestion,
      status
    };
  };
  
  const urlValidation = validateBaseUrl(config.baseUrl);
  
  // 🔧 Auto-corrigir URL
  const handleAutoFixUrl = () => {
    if (urlValidation.suggestion) {
      setConfig({ ...config, baseUrl: urlValidation.suggestion });
      toast.success('URL corrigida automaticamente!');
    }
  };

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/settings/staysnet`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setConfig(data.data);
        }
      }
    } catch (error) {
      console.error('Error loading Stays.net config:', error);
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/settings/staysnet`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(config),
        }
      );

      if (response.ok) {
        toast.success('Configuração salva com sucesso!');
        setConfig({ ...config, lastSync: new Date().toISOString() });
      } else {
        throw new Error('Failed to save config');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setConnectionStatus('idle');
    
    try {
      // Validação antes de enviar
      if (!config.baseUrl || !config.apiKey) {
        toast.error('Preencha Base URL e API Key/Login');
        setConnectionStatus('error');
        setIsTesting(false);
        return;
      }

      // 🎯 VALIDAÇÃO INTELIGENTE: Bloquear se URL está claramente errada
      if (urlValidation.status === 'fixable') {
        toast.error('URL incorreta! Use o botão "Corrigir Automaticamente" antes de testar.', {
          duration: 5000,
        });
        setConnectionStatus('error');
        setIsTesting(false);
        return;
      }

      if (urlValidation.status === 'invalid') {
        toast.error('URL inválida! Verifique o formato da URL.', {
          duration: 5000,
        });
        setConnectionStatus('error');
        setIsTesting(false);
        return;
      }

      console.log('[StaysNet Frontend] Testing connection with:', {
        baseUrl: config.baseUrl,
        hasApiKey: !!config.apiKey,
        hasApiSecret: !!config.apiSecret,
        urlValidation: urlValidation.status,
      });

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/staysnet/test`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            apiKey: config.apiKey,
            apiSecret: config.apiSecret,
            baseUrl: config.baseUrl,
          }),
        }
      );

      console.log('[StaysNet Frontend] Response status:', response.status);

      const data = await response.json();
      console.log('[StaysNet Frontend] Response data:', data);

      if (response.ok) {
        if (data.success) {
          setConnectionStatus('success');
          toast.success('Conexão estabelecida com sucesso!');
          console.log('[StaysNet Frontend] Connection successful');
        } else {
          setConnectionStatus('error');
          const errorMsg = data.error || 'Erro desconhecido';
          console.error('[StaysNet Frontend] Connection failed:', errorMsg);
          toast.error('Falha na conexão: ' + errorMsg, { duration: 5000 });
        }
      } else {
        setConnectionStatus('error');
        const errorMsg = data.error || `HTTP ${response.status}`;
        console.error('[StaysNet Frontend] Request failed:', errorMsg);
        toast.error('Erro ao testar conexão: ' + errorMsg, { duration: 5000 });
      }
    } catch (error: any) {
      console.error('[StaysNet Frontend] Error testing connection:', error);
      setConnectionStatus('error');
      toast.error('Erro ao conectar com a API: ' + error.message, { duration: 5000 });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestEndpoint = async (endpoint: ApiEndpoint) => {
    setIsLoadingEndpoint(endpoint.id);
    
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/staysnet/test-endpoint`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            apiKey: config.apiKey,
            baseUrl: config.baseUrl,
            endpoint: endpoint.endpoint,
            method: endpoint.method,
          }),
        }
      );

      const data = await response.json();
      
      const apiResponse: ApiResponse = {
        endpoint: endpoint.endpoint,
        success: data.success,
        data: data.data,
        error: data.error,
        timestamp: new Date().toISOString(),
      };
      
      setApiResponses(new Map(apiResponses.set(endpoint.id, apiResponse)));
      setSelectedEndpoint(endpoint.id);
      
      if (data.success) {
        toast.success(`Endpoint testado: ${endpoint.name}`);
      } else {
        toast.error(`Erro no endpoint: ${endpoint.name}`);
      }
    } catch (error) {
      console.error('Error testing endpoint:', error);
      toast.error('Erro ao testar endpoint');
    } finally {
      setIsLoadingEndpoint(null);
    }
  };


  const handleExportResponse = (endpointId: string) => {
    const response = apiResponses.get(endpointId);
    if (!response) return;
    
    const dataStr = JSON.stringify(response, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `staysnet-${endpointId}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('Resposta exportada com sucesso!');
  };

  // 🎯 Função de Importação Completa
  const handleFullImport = async () => {
    setIsImporting(true);
    setImportType('all');
    setImportError(null);
    setImportStats(null);

    try {
      const token = localStorage.getItem('rendizy-token');
      if (!token) {
        throw new Error('Token não encontrado. Faça login novamente.');
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/staysnet/import/full`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': token,
            'apikey': publicAnonKey,
          },
          body: JSON.stringify({
            startDate: '2025-01-01',
            endDate: '2026-12-31',
            // Não especificar selectedPropertyIds = importar TODAS
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setImportStats(data.stats);
        toast.success('Importação completa realizada com sucesso!');
        
        // Atualizar lastSync
        setConfig({ ...config, lastSync: new Date().toISOString() });
      } else {
        throw new Error(data.error || 'Erro ao importar dados');
      }
    } catch (error: any) {
      console.error('Erro ao importar:', error);
      setImportError(error.message || 'Erro ao importar dados');
      toast.error(error.message || 'Erro ao importar dados');
    } finally {
      setIsImporting(false);
      setImportType(null);
    }
  };

  // 🎯 Função de Importação Individual
  const handleImport = async (type: 'properties' | 'reservations' | 'guests') => {
    setIsImporting(true);
    setImportType(type);
    setImportError(null);
    setImportStats(null);

    try {
      const token = localStorage.getItem('rendizy-token');
      if (!token) {
        throw new Error('Token não encontrado. Faça login novamente.');
      }

      // Para importação individual, também usamos a rota /import/full
      // mas com parâmetros específicos
      const body: any = {
        startDate: '2025-01-01',
        endDate: '2026-12-31',
      };

      // Se for apenas propriedades, não precisa de datas
      if (type === 'properties') {
        delete body.startDate;
        delete body.endDate;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/staysnet/import/full`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Auth-Token': token,
            'apikey': publicAnonKey,
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        // Filtrar estatísticas apenas para o tipo importado
        const filteredStats = {
          guests: type === 'guests' ? data.stats.guests : { fetched: 0, created: 0, updated: 0, failed: 0 },
          properties: type === 'properties' ? data.stats.properties : { fetched: 0, created: 0, updated: 0, failed: 0 },
          reservations: type === 'reservations' ? data.stats.reservations : { fetched: 0, created: 0, updated: 0, failed: 0 },
          errors: data.stats.errors || [],
        };
        
        setImportStats(filteredStats);
        toast.success(`${type === 'properties' ? 'Anúncios' : type === 'reservations' ? 'Reservas' : 'Hóspedes'} importados com sucesso!`);
        
        // Atualizar lastSync
        setConfig({ ...config, lastSync: new Date().toISOString() });
      } else {
        throw new Error(data.error || 'Erro ao importar dados');
      }
    } catch (error: any) {
      console.error('Erro ao importar:', error);
      setImportError(error.message || 'Erro ao importar dados');
      toast.error(error.message || 'Erro ao importar dados');
    } finally {
      setIsImporting(false);
      setImportType(null);
    }
  };

  // ✅ CORREÇÃO: Garantir que filteredEndpoints seja sempre definido
  // Evita erro "Cannot access 'x' before initialization" durante minificação
  // ✅ FORÇA NOVO HASH - v1.0.103.322 - 24/11/2025 00:52
  const filteredEndpoints = useMemo(() => {
    return API_ENDPOINTS.filter((endpoint) => {
      const matchesSearch = 
        endpoint.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        endpoint.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        endpoint.endpoint.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || endpoint.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="space-y-6">
      {/* Status badges - apenas quando não está em Dialog */}
      <div className="flex items-center justify-end gap-2">
        {config.enabled && (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Ativo
          </Badge>
        )}
        
        {config.lastSync && (
          <Badge variant="outline">
            Última sincronização: {new Date(config.lastSync).toLocaleString('pt-BR')}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList className="w-full flex flex-wrap gap-3">
          <TabsTrigger value="config" className="flex-none justify-center px-4 py-2 min-w-[150px]">
            <Key className="w-4 h-4 mr-2" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="import" className="flex-none justify-center px-4 py-2 min-w-[150px]">
            <Upload className="w-4 h-4 mr-2" />
            Importação
          </TabsTrigger>
          <TabsTrigger value="mapping" className="flex-none justify-center px-4 py-2 min-w-[150px]">
            <Database className="w-4 h-4 mr-2" />
            Mapeamento de Campos
          </TabsTrigger>
          <TabsTrigger value="test" className="flex-none justify-center px-4 py-2 min-w-[150px]">
            <RefreshCw className="w-4 h-4 mr-2" />
            Ambiente de Teste
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CONFIGURAÇÃO */}
        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Credenciais da API</CardTitle>
              <CardDescription>
                Configure suas credenciais de acesso à API do Stays.net
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 🎯 ALERTA INTELIGENTE DE URL */}
              {config.baseUrl && urlValidation.status === 'fixable' && (
                <Alert className="bg-red-50 border-red-300">
                  <AlertCircle className="h-4 w-4 text-red-700" />
                  <AlertDescription className="text-red-900">
                    <div className="space-y-3">
                      <p className="text-sm"><strong>⚠️ URL INCORRETA DETECTADA!</strong></p>
                      
                      <div className="bg-white p-3 rounded border border-red-200">
                        <p className="text-xs mb-1 text-red-700"><strong>❌ Você digitou (ERRADO):</strong></p>
                        <code className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs block">
                          {config.baseUrl}
                        </code>
                      </div>

                      <div className="bg-white p-3 rounded border border-green-200">
                        <p className="text-xs mb-1 text-green-700"><strong>✅ URL Correta (com /external/v1):</strong></p>
                        <code className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs block">
                          {urlValidation.suggestion}
                        </code>
                      </div>

                      <Button
                        onClick={handleAutoFixUrl}
                        className="w-full bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Corrigir Automaticamente
                      </Button>

                      <p className="text-xs text-red-700 pt-2 border-t border-red-300">
                        <strong>💡 Explicação:</strong> A API Stays.net <strong>sempre</strong> requer <code className="bg-red-100 px-1 rounded">/external/v1</code> no final da URL. 
                        Sem isso, você acessa o painel de administração (HTML) ao invés da API (JSON).
                      </p>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {config.baseUrl && urlValidation.status === 'correct' && (
                <Alert className="bg-green-50 border-green-300">
                  <CheckCircle2 className="h-4 w-4 text-green-700" />
                  <AlertDescription className="text-green-900">
                    <p className="text-sm"><strong>✅ URL CORRETA!</strong></p>
                    <p className="text-xs mt-1">
                      A URL está no formato correto e termina com <code className="bg-green-100 px-1 rounded">/external/v1</code>
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Base URL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="baseUrl">Base URL</Label>
                  {urlValidation.status === 'correct' && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Correta
                    </Badge>
                  )}
                  {urlValidation.status === 'fixable' && (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Incorreta
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Globe className="w-5 h-5 text-muted-foreground mt-2" />
                  <Input
                    id="baseUrl"
                    value={config.baseUrl}
                    onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                    placeholder="https://bvm.stays.net/external/v1"
                    className={urlValidation.status === 'fixable' ? 'border-red-300 focus:border-red-500' : ''}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 A URL deve terminar com <code className="bg-muted px-1 rounded">/external/v1</code>
                </p>
              </div>

              {/* API Key / Login */}
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key / Login</Label>
                <div className="flex gap-2">
                  <Key className="w-5 h-5 text-muted-foreground mt-2" />
                  <div className="flex-1 relative">
                    <Input
                      id="apiKey"
                      type={showApiKey ? 'text' : 'password'}
                      value={config.apiKey}
                      onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                      placeholder="Ex: a5146970 ou sua API Key"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-7"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* API Secret / Senha (Opcional) */}
              <div className="space-y-2">
                <Label htmlFor="apiSecret">
                  API Secret / Senha <span className="text-xs text-muted-foreground">(Opcional)</span>
                </Label>
                <div className="flex gap-2">
                  <Key className="w-5 h-5 text-muted-foreground mt-2" />
                  <div className="flex-1 relative">
                    <Input
                      id="apiSecret"
                      type={showApiKey ? 'text' : 'password'}
                      value={config.apiSecret || ''}
                      onChange={(e) => setConfig({ ...config, apiSecret: e.target.value })}
                      placeholder="Ex: bfcf4daf (deixe vazio se não tiver)"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Algumas APIs usam login + senha separados. Se sua API usa apenas uma chave, deixe este campo vazio.
                </p>
              </div>

              {/* Nome da Conta */}
              <div className="space-y-2">
                <Label htmlFor="accountName">
                  Nome da Conta <span className="text-xs text-muted-foreground">(Opcional)</span>
                </Label>
                <div className="flex gap-2">
                  <Building2 className="w-5 h-5 text-muted-foreground mt-2" />
                  <Input
                    id="accountName"
                    value={config.accountName || ''}
                    onChange={(e) => setConfig({ ...config, accountName: e.target.value })}
                    placeholder="Ex: Sua Casa Rende Mais"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Nome identificador da conta Stays.net
                </p>
              </div>

              {/* Link de Notificações */}
              <div className="space-y-2">
                <Label htmlFor="notificationWebhookUrl">
                  Link de Notificações <span className="text-xs text-muted-foreground">(Opcional)</span>
                </Label>
                <div className="flex gap-2">
                  <Globe className="w-5 h-5 text-muted-foreground mt-2" />
                  <div className="flex-1 flex gap-2">
                    <Input
                      id="notificationWebhookUrl"
                      value={config.notificationWebhookUrl || ''}
                      onChange={(e) => setConfig({ ...config, notificationWebhookUrl: e.target.value })}
                      placeholder="https://seu-dominio.com/webhook/staysnet"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Testar webhook (implementar depois)
                        toast.info('Funcionalidade de teste de webhook em desenvolvimento');
                      }}
                    >
                      Testar
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  URL para receber notificações do Stays.net (webhook)
                </p>
              </div>

              {/* Escopo (Global/Individual) */}
              <div className="space-y-2">
                <Label htmlFor="scope">Escopo</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={config.scope === 'global' ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => setConfig({ ...config, scope: 'global' })}
                      >
                        Global
                      </Button>
                      <Button
                        type="button"
                        variant={config.scope === 'individual' ? 'default' : 'outline'}
                        className="flex-1"
                        onClick={() => setConfig({ ...config, scope: 'individual' })}
                      >
                        Individual
                      </Button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Escopo da integração: Global (todas as propriedades) ou Individual (por propriedade)
                </p>
              </div>

              {/* Alert com URLs corretas */}
              <Alert className="bg-blue-50 border-blue-300">
                <Info className="h-4 w-4 text-blue-700" />
                <AlertDescription className="text-blue-900 space-y-3">
                  <p className="text-sm"><strong>📖 URL Correta da API Stays.net</strong></p>
                  
                  <div className="bg-white p-3 rounded border border-blue-200">
                    <p className="text-xs mb-2 font-semibold">✅ Formato Correto (com /external/v1):</p>
                    <code className="bg-green-100 text-green-800 px-2 py-1 rounded font-mono text-xs block">
                      https://bvm.stays.net/external/v1
                    </code>
                  </div>

                  <div className="bg-red-50 p-3 rounded border border-red-200">
                    <p className="text-xs mb-2 font-semibold">❌ Formato Errado (sem /external/v1):</p>
                    <code className="bg-red-100 text-red-800 px-2 py-1 rounded font-mono text-xs block line-through">
                      https://bvm.stays.net
                    </code>
                  </div>

                  <div className="space-y-1 text-xs">
                    <p className="font-semibold">📝 Outras URLs para testar:</p>
                    <div className="ml-2 space-y-1">
                      <div>• <code className="bg-blue-100 px-1 rounded">https://api.stays.net/external/v1</code></div>
                      <div>• <code className="bg-blue-100 px-1 rounded">https://play.stays.net/external/v1</code></div>
                      <div>• <code className="bg-blue-100 px-1 rounded">https://yourcompany.stays.net/external/v1</code></div>
                    </div>
                  </div>

                  <p className="text-xs pt-2 border-t border-blue-300">
                    💡 <strong>Dica:</strong> A URL da API sempre termina com <code className="bg-blue-100 px-1 rounded">/external/v1</code>
                  </p>
                </AlertDescription>
              </Alert>

              <Separator />

              {/* Status da Conexão */}
              {connectionStatus !== 'idle' && (
                <Alert className={connectionStatus === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                  {connectionStatus === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertDescription className={connectionStatus === 'success' ? 'text-green-800' : 'text-red-800'}>
                    {connectionStatus === 'success'
                      ? '✅ Conexão estabelecida com sucesso! A API está respondendo corretamente.'
                      : '❌ Falha na conexão. Abra o Console do navegador (F12) para ver detalhes do erro e possíveis soluções.'}
                  </AlertDescription>
                </Alert>
              )}

              {/* Ações */}
              <div className="flex flex-col gap-3 pt-4">
                {/* Mensagem de aviso se URL estiver errada */}
                {urlValidation.status === 'fixable' && (
                  <Alert className="bg-yellow-50 border-yellow-300">
                    <AlertCircle className="h-4 w-4 text-yellow-700" />
                    <AlertDescription className="text-yellow-900 text-sm">
                      <strong>⚠️ Corrija a URL antes de testar!</strong> Use o botão "Corrigir Automaticamente" acima.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={
                      !config.apiKey || 
                      !config.baseUrl || 
                      isTesting || 
                      urlValidation.status === 'fixable' ||
                      urlValidation.status === 'invalid'
                    }
                    className={urlValidation.status === 'fixable' ? 'opacity-50 cursor-not-allowed' : ''}
                  >
                    {isTesting ? (
                      <span className="flex items-center">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Testando...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Testar Conexão
                      </span>
                    )}
                  </Button>

                  <Button
                    onClick={handleSaveConfig}
                    disabled={
                      !config.apiKey || 
                      !config.baseUrl || 
                      isSaving ||
                      urlValidation.status !== 'correct'
                    }
                  >
                    {isSaving ? (
                      <span className="flex items-center">
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Salvando...
                      </span>
                    ) : (
                      'Salvar Configuração'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documentação */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Como Obter suas Credenciais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Para integrar com o Stays.net, você precisa:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Acessar o painel do Stays.net em <a href="https://bvm.stays.net" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">bvm.stays.net</a></li>
                <li>Ir em <strong>App Center → API Stays</strong></li>
                <li>Gerar uma nova <strong>API Key</strong></li>
                <li>Copiar e colar a chave no campo acima</li>
                <li>Testar a conexão</li>
              </ol>
              
              <Alert className="mt-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Documentação completa: <a href="https://stays.net/external-api/#introduction" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">stays.net/external-api</a>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: IMPORTAÇÃO */}
        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Importar Dados do Stays.net
              </CardTitle>
              <CardDescription>
                Sincronize anúncios, reservas e hóspedes do Stays.net para o Rendizy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Alerta de Configuração */}
              {(!config.apiKey || !config.baseUrl) && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Configure suas credenciais na aba "Configuração" antes de importar dados.
                  </AlertDescription>
                </Alert>
              )}

              {/* Botões de Importação */}
              {config.apiKey && config.baseUrl && (
                <div className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Importação Completa:</strong> Importa todos os anúncios, todas as reservas (01/01/2025 até 31/12/2026) e todos os hóspedes desse período.
                    </AlertDescription>
                  </Alert>

                  {/* Botão Importação Completa */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-2 border-blue-500">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Database className="w-5 h-5 text-blue-600" />
                          Importação Completa
                        </CardTitle>
                        <CardDescription>
                          Importa anúncios, reservas e hóspedes de uma vez
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Button
                          onClick={() => handleFullImport()}
                          disabled={isImporting}
                          className="w-full"
                          size="lg"
                        >
                          {isImporting && importType === 'all' ? (
                            <span className="flex items-center">
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Importando...
                            </span>
                          ) : (
                            <span className="flex items-center">
                              <Upload className="w-4 h-4 mr-2" />
                              Importar Tudo
                            </span>
                          )}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          • Anúncios (propriedades)<br />
                          • Reservas (01/01/2025 - 31/12/2026)<br />
                          • Hóspedes
                        </p>
                      </CardContent>
                    </Card>

                    {/* Botões Individuais */}
                    <div className="space-y-3">
                      <Card>
                        <CardContent className="pt-6">
                          <Button
                            onClick={() => handleImport('properties')}
                            disabled={isImporting}
                            variant="outline"
                            className="w-full"
                            size="lg"
                          >
                            {isImporting && importType === 'properties' ? (
                              <span className="flex items-center">
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Importando...
                              </span>
                            ) : (
                              <span className="flex items-center">
                                <Home className="w-4 h-4 mr-2" />
                                Importar Anúncios
                              </span>
                            )}
                          </Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <Button
                            onClick={() => handleImport('reservations')}
                            disabled={isImporting}
                            variant="outline"
                            className="w-full"
                            size="lg"
                          >
                            {isImporting && importType === 'reservations' ? (
                              <span className="flex items-center">
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Importando...
                              </span>
                            ) : (
                              <span className="flex items-center">
                                <Calendar className="w-4 h-4 mr-2" />
                                Importar Reservas
                              </span>
                            )}
                          </Button>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <Button
                            onClick={() => handleImport('guests')}
                            disabled={isImporting}
                            variant="outline"
                            className="w-full"
                            size="lg"
                          >
                            {isImporting && importType === 'guests' ? (
                              <span className="flex items-center">
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Importando...
                              </span>
                            ) : (
                              <span className="flex items-center">
                                <Users className="w-4 h-4 mr-2" />
                                Importar Hóspedes
                              </span>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Estatísticas de Importação */}
                  {importStats && (
                    <Card className="bg-green-50 dark:bg-green-900/20 border-green-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
                          <CheckCircle2 className="w-5 h-5" />
                          Importação Concluída!
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Hóspedes */}
                          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                              <Users className="w-4 h-4 text-blue-600" />
                              <span className="font-semibold">Hóspedes</span>
                            </div>
                            <div className="space-y-1 text-sm">
                              <p>Buscados: <strong>{importStats.guests?.fetched || 0}</strong></p>
                              <p>Criados: <strong className="text-green-600">{importStats.guests?.created || 0}</strong></p>
                              <p>Atualizados: <strong className="text-blue-600">{importStats.guests?.updated || 0}</strong></p>
                              {importStats.guests?.failed > 0 && (
                                <p className="text-red-600">Falharam: <strong>{importStats.guests.failed}</strong></p>
                              )}
                            </div>
                          </div>

                          {/* Propriedades */}
                          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                              <Home className="w-4 h-4 text-purple-600" />
                              <span className="font-semibold">Propriedades</span>
                            </div>
                            <div className="space-y-1 text-sm">
                              <p>Buscadas: <strong>{importStats.properties?.fetched || 0}</strong></p>
                              <p>Criadas: <strong className="text-green-600">{importStats.properties?.created || 0}</strong></p>
                              <p>Atualizadas: <strong className="text-blue-600">{importStats.properties?.updated || 0}</strong></p>
                              {importStats.properties?.failed > 0 && (
                                <p className="text-red-600">Falharam: <strong>{importStats.properties.failed}</strong></p>
                              )}
                            </div>
                          </div>

                          {/* Reservas */}
                          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="w-4 h-4 text-green-600" />
                              <span className="font-semibold">Reservas</span>
                            </div>
                            <div className="space-y-1 text-sm">
                              <p>Buscadas: <strong>{importStats.reservations?.fetched || 0}</strong></p>
                              <p>Criadas: <strong className="text-green-600">{importStats.reservations?.created || 0}</strong></p>
                              <p>Atualizadas: <strong className="text-blue-600">{importStats.reservations?.updated || 0}</strong></p>
                              {importStats.reservations?.failed > 0 && (
                                <p className="text-red-600">Falharam: <strong>{importStats.reservations.failed}</strong></p>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Erros (se houver) */}
                        {importStats.errors && importStats.errors.length > 0 && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Erros encontrados:</strong>
                              <ul className="list-disc list-inside mt-2 text-sm">
                                {importStats.errors.slice(0, 5).map((error: string, index: number) => (
                                  <li key={index}>{error}</li>
                                ))}
                                {importStats.errors.length > 5 && (
                                  <li>... e mais {importStats.errors.length - 5} erros</li>
                                )}
                              </ul>
                            </AlertDescription>
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Erro de Importação */}
                  {importError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{importError}</AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Nota sobre Sincronização Automática */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>🔄 Sincronização Automática:</strong> O sistema está planejado para sincronizar automaticamente 
              a cada 1 minuto, buscando novas propriedades, reservas e hóspedes do Stays.net. 
              Esta funcionalidade será implementada em breve.
            </AlertDescription>
          </Alert>
        </TabsContent>

        {/* TAB 4: MAPEAMENTO DE CAMPOS */}
        <TabsContent value="mapping" className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Esta seção está em desenvolvimento. Aqui você poderá mapear os campos da API do Stays.net
              para os campos do RENDIZY, criando uma correspondência personalizada.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Mapeamento Automático</CardTitle>
              <CardDescription>
                O sistema irá sugerir automaticamente o mapeamento com base nos nomes e tipos de dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Funcionalidade disponível em breve...
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: AMBIENTE DE TESTE */}
        <TabsContent value="test" className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Teste os endpoints da API e visualize as respostas em tempo real. 
              Use esta ferramenta para entender a estrutura de dados retornada.
            </AlertDescription>
          </Alert>

          {/* Filtros */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar endpoints..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                {/* Category Filter */}
                <div className="flex gap-2">
                  <Button
                    variant={selectedCategory === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory('all')}
                  >
                    Todos
                  </Button>
                  {Object.entries(CATEGORY_INFO).map(([key, info]) => (
                    <Button
                      key={key}
                      variant={selectedCategory === key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(key)}
                    >
                      {info.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grid de Endpoints */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista de Endpoints */}
            <div className="space-y-4">
              <ScrollArea className="h-[600px] pr-4">
                {filteredEndpoints.map((endpoint) => {
                  const categoryInfo = CATEGORY_INFO[endpoint.category];
                  const IconComponent = categoryInfo.icon;
                  const response = apiResponses.get(endpoint.id);
                  
                  return (
                    <Card
                      key={endpoint.id}
                      className={`mb-3 cursor-pointer transition-all ${
                        selectedEndpoint === endpoint.id
                          ? 'border-blue-500 shadow-md'
                          : 'hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedEndpoint(endpoint.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`w-10 h-10 rounded-lg bg-${categoryInfo.color}-100 flex items-center justify-center flex-shrink-0`}>
                              <IconComponent className={`w-5 h-5 text-${categoryInfo.color}-600`} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{endpoint.name}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {endpoint.method}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">
                                {endpoint.description}
                              </p>
                              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {endpoint.endpoint}
                              </code>
                              
                              {response && (
                                <div className="mt-2">
                                  {response.success ? (
                                    <Badge className="bg-green-100 text-green-700 border-green-200">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      Sucesso
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-red-100 text-red-700 border-red-200">
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Erro
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTestEndpoint(endpoint);
                            }}
                            disabled={!config.apiKey || isLoadingEndpoint === endpoint.id}
                          >
                            {isLoadingEndpoint === endpoint.id ? (
                              <span><Loader2 className="w-4 h-4 animate-spin" /></span>
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                
                {filteredEndpoints.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum endpoint encontrado
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Visualização da Resposta */}
            <div>
              <Card className="sticky top-4">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Resposta da API</CardTitle>
                    {selectedEndpoint && apiResponses.has(selectedEndpoint) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExportResponse(selectedEndpoint)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Exportar JSON
                      </Button>
                    )}
                  </div>
                  <CardDescription>
                    {selectedEndpoint
                      ? API_ENDPOINTS.find(e => e.id === selectedEndpoint)?.name
                      : 'Selecione um endpoint para ver a resposta'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedEndpoint && apiResponses.has(selectedEndpoint) ? (
                    <ScrollArea className="h-[500px]">
                      <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-x-auto">
                        {JSON.stringify(apiResponses.get(selectedEndpoint), null, 2)}
                      </pre>
                    </ScrollArea>
                  ) : (
                    <div className="h-[500px] flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Database className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p>Selecione um endpoint e clique em testar</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
