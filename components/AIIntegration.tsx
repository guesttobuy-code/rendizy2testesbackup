/**
 * RENDIZY - Integração com Provedor de IA
 *
 * Permite configurar um provedor (ex.: OpenAI) para uso interno (Automações, Assistentes, etc.)
 * Persistência segura (backend) e teste remoto com o provedor real.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import {
  Activity,
  Bot,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  Link,
  MessageSquare,
  RefreshCcw,
  Shield,
  XCircle,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Clock,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { integrationsApi, type AIProviderConfigResponse, type AIProviderConfigListItem } from '../utils/api';

type ProviderId = 'openai' | 'azure-openai' | 'huggingface' | 'deepseek' | 'anthropic' | 'google-gemini' | 'groq' | 'together' | 'custom';

interface ProviderMeta {
  id: ProviderId;
  name: string;
  description: string;
  baseUrl: string;
  defaultModel: string;
  docsUrl: string;
  labelVariant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning';
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    description: 'Ideal para qualidade máxima (GPT-4o, GPT-4.1, GPT-3.5, etc.)',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    docsUrl: 'https://platform.openai.com/docs/introduction',
    labelVariant: 'success',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    description: 'Modelo de IA de alta performance e custo-benefício (DeepSeek Chat, DeepSeek Coder).',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    docsUrl: 'https://platform.deepseek.com/docs',
    labelVariant: 'success',
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    description: 'Claude 3.5 Sonnet, Opus e Haiku - modelos avançados da Anthropic.',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-3-5-sonnet-20241022',
    docsUrl: 'https://docs.anthropic.com/claude/reference/getting-started-with-the-api',
    labelVariant: 'success',
  },
  {
    id: 'google-gemini',
    name: 'Google Gemini',
    description: 'Modelos Gemini Pro e Ultra da Google (Gemini 1.5 Pro, Flash, etc.).',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-1.5-pro',
    docsUrl: 'https://ai.google.dev/docs',
    labelVariant: 'secondary',
  },
  {
    id: 'groq',
    name: 'Groq',
    description: 'Inferência ultra-rápida com modelos Llama, Mixtral e outros (gratuito até certo limite).',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.1-70b-versatile',
    docsUrl: 'https://console.groq.com/docs',
    labelVariant: 'default',
  },
  {
    id: 'together',
    name: 'Together AI',
    description: 'Acesso a modelos open-source (Llama, Mistral, Mixtral) com preços competitivos.',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Llama-3-70b-chat-hf',
    docsUrl: 'https://docs.together.ai',
    labelVariant: 'default',
  },
  {
    id: 'azure-openai',
    name: 'Azure OpenAI',
    description: 'Hospedagem Microsoft com redes privadas, compliance e modelos GPT.',
    baseUrl: 'https://YOUR-RESOURCE-NAME.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT',
    defaultModel: 'gpt-4o',
    docsUrl: 'https://learn.microsoft.com/azure/ai-services/openai/',
    labelVariant: 'secondary',
  },
  {
    id: 'huggingface',
    name: 'Hugging Face Inference',
    description: 'Modelos open-source (Llama 3, Mistral, etc.) via Inference API.',
    baseUrl: 'https://api-inference.huggingface.co',
    defaultModel: 'meta-llama/Meta-Llama-3-8B-Instruct',
    docsUrl: 'https://huggingface.co/docs/api-inference/en/index',
    labelVariant: 'default',
  },
  {
    id: 'custom',
    name: 'Provider Personalizado',
    description: 'Use qualquer endpoint compatível com OpenAI / Chat Completions.',
    baseUrl: '',
    defaultModel: '',
    docsUrl: 'https://platform.openai.com/docs/api-reference/chat/create',
    labelVariant: 'outline',
  },
];

interface AIIntegrationConfig {
  enabled: boolean;
  provider: ProviderId;
  baseUrl: string;
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  promptTemplate: string;
  lastUpdated?: string;
  notes?: string;
}

const DEFAULT_PROMPT = 'Você é o copiloto oficial do Rendizy. Responda sempre em português brasileiro.';

const DEFAULT_STATE: AIIntegrationConfig = {
  enabled: false,
  provider: 'openai',
  baseUrl: PROVIDERS.find((p) => p.id === 'openai')?.baseUrl || '',
  defaultModel: PROVIDERS.find((p) => p.id === 'openai')?.defaultModel || '',
  temperature: 0.2,
  maxTokens: 512,
  promptTemplate: DEFAULT_PROMPT,
  lastUpdated: undefined,
  notes: '',
};

export function AIIntegration() {
  const [config, setConfig] = useState<AIIntegrationConfig>(DEFAULT_STATE);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasRemoteApiKey, setHasRemoteApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<{
    status: 'success' | 'error' | 'idle';
    message?: string;
    testedAt?: string;
  }>({
    status: 'idle',
  });
  const [savedConfigs, setSavedConfigs] = useState<AIProviderConfigListItem[]>([]);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);

  const providerMeta = useMemo(
    () => PROVIDERS.find((p) => p.id === config.provider) || PROVIDERS[0],
    [config.provider],
  );

  // Desabilitar inputs durante carregamento, salvamento ou teste
  const disableInputs = isLoadingConfig || isSaving || isTesting;
  const disableTest = isLoadingConfig || isSaving || isTesting;

  const mapResponseToConfig = useCallback((data?: AIProviderConfigResponse): AIIntegrationConfig => {
    const providerId = (data?.provider as ProviderId) || 'openai';
    const defaults = PROVIDERS.find((p) => p.id === providerId) || PROVIDERS[0];
    return {
      enabled: data?.enabled ?? data?.exists ?? false,
      provider: providerId,
      baseUrl: data?.base_url || defaults.baseUrl,
      defaultModel: data?.default_model || defaults.defaultModel,
      temperature: data?.temperature ?? 0.2,
      maxTokens: data?.max_tokens ?? 512,
      promptTemplate: data?.prompt_template || DEFAULT_PROMPT,
      lastUpdated: data?.updated_at,
      notes: data?.notes ?? '',
    };
  }, []);

  const loadRemoteConfig = useCallback(async () => {
    setIsLoadingConfig(true);
    setLoadError(null);
    try {
      const response = await integrationsApi.ai.getConfig();
      if (!response.success) {
        throw new Error(response.error || 'Falha ao carregar configuração de IA');
      }
      const nextConfig = mapResponseToConfig(response.data);
      setConfig(nextConfig);
      setHasRemoteApiKey(Boolean(response.data?.hasApiKey));
      setApiKeyInput('');
      setLoadError(null);
    } catch (error: any) {
      console.error('❌ [AIIntegration] Erro ao carregar config:', error);
      setLoadError(error?.message || 'Erro ao carregar configuração de IA');
    } finally {
      setIsLoadingConfig(false);
    }
  }, [mapResponseToConfig]);

  useEffect(() => {
    loadRemoteConfig();
  }, [loadRemoteConfig]);

  const handleChange = <K extends keyof AIIntegrationConfig>(field: K, value: AIIntegrationConfig[K]) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleProviderChange = (providerId: ProviderId) => {
    const meta = PROVIDERS.find((p) => p.id === providerId);
    if (!meta) return;

    setConfig((prev) => ({
      ...prev,
      provider: providerId,
      baseUrl: meta.baseUrl,
      defaultModel: meta.defaultModel,
    }));
  };

  const loadSavedConfigs = useCallback(async () => {
    setIsLoadingConfigs(true);
    try {
      const response = await integrationsApi.ai.listConfigs();
      if (response.success && response.data) {
        setSavedConfigs(response.data.configs || []);
      }
    } catch (error: any) {
      console.error('❌ [AIIntegration] Erro ao carregar lista de configs:', error);
    } finally {
      setIsLoadingConfigs(false);
    }
  }, []);

  useEffect(() => {
    loadSavedConfigs();
  }, [loadSavedConfigs]);

  const handleEditConfig = (savedConfig: AIProviderConfigListItem) => {
    setEditingConfigId(savedConfig.id);
    const providerId = savedConfig.provider as ProviderId;
    const defaults = PROVIDERS.find((p) => p.id === providerId) || PROVIDERS[0];
    setConfig({
      enabled: savedConfig.enabled,
      provider: providerId,
      baseUrl: savedConfig.base_url,
      defaultModel: savedConfig.default_model,
      temperature: savedConfig.temperature,
      maxTokens: savedConfig.max_tokens,
      promptTemplate: 'Você é o copiloto oficial do Rendizy. Responda sempre em português brasileiro.',
      notes: savedConfig.notes || '',
    });
    setApiKeyInput('');
    setHasRemoteApiKey(savedConfig.hasApiKey);
    // Scroll para o formulário
    setTimeout(() => {
      document.getElementById('ai-config-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleToggleStatus = async (configId: string, currentStatus: boolean) => {
    try {
      const response = await integrationsApi.ai.toggleStatus(configId, !currentStatus);
      if (response.success) {
        toast.success(`Configuração ${!currentStatus ? 'ativada' : 'desativada'} com sucesso`);
        await loadSavedConfigs();
        await loadRemoteConfig(); // Recarregar config ativa
      } else {
        toast.error(response.error || 'Erro ao atualizar status');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar status');
    }
  };

  const handleDeleteConfig = async (configId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta configuração? Esta ação não pode ser desfeita.')) {
      return;
    }
    try {
      const response = await integrationsApi.ai.deleteConfig(configId);
      if (response.success) {
        toast.success('Configuração deletada com sucesso');
        await loadSavedConfigs();
        if (editingConfigId === configId) {
          setEditingConfigId(null);
          setConfig(DEFAULT_STATE);
          setApiKeyInput('');
          setHasRemoteApiKey(false);
        }
      } else {
        toast.error(response.error || 'Erro ao deletar configuração');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao deletar configuração');
    }
  };

  const handleNewConfig = () => {
    setEditingConfigId(null);
    setConfig(DEFAULT_STATE);
    setApiKeyInput('');
    setHasRemoteApiKey(false);
    setTimeout(() => {
      document.getElementById('ai-config-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSave = async () => {
    if (isLoadingConfig) return;
    setIsSaving(true);
    try {
      const response = await integrationsApi.ai.upsertConfig({
        id: editingConfigId || undefined,
        name: editingConfigId ? undefined : `${providerMeta.name} - ${new Date().toLocaleDateString('pt-BR')}`,
        provider: config.provider,
        baseUrl: config.baseUrl,
        defaultModel: config.defaultModel,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        promptTemplate: config.promptTemplate,
        notes: config.notes,
        enabled: config.enabled,
        isActive: !editingConfigId ? true : undefined, // Se criando nova, ativar automaticamente
        apiKey: apiKeyInput || undefined,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Falha ao salvar configuração de IA');
      }

      toast.success(editingConfigId ? 'Configuração atualizada com sucesso' : 'Nova configuração criada com sucesso');
      await loadSavedConfigs();
      await loadRemoteConfig();
      
      if (!editingConfigId) {
        // Se criou nova, limpar formulário
        setConfig(DEFAULT_STATE);
        setEditingConfigId(null);
      } else {
        // Se editou, atualizar estado
        const nextConfig = mapResponseToConfig(response.data);
        setConfig(nextConfig);
      }
      
      setHasRemoteApiKey(Boolean(response.data?.hasApiKey));
      setApiKeyInput('');
    } catch (error: any) {
      console.error('❌ [AIIntegration] Erro ao salvar:', error);
      toast.error(error?.message || 'Falha ao salvar configuração de IA');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setLastTestResult({
      status: 'idle',
    });

    try {
      const response = await integrationsApi.ai.testConfig();

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Falha ao testar provedor de IA');
      }

      setLastTestResult({
        status: 'success',
        message: `Status ${response.data.httpStatus} - ${
          response.data.modelsCount !== undefined
            ? `${response.data.modelsCount} modelos listados`
            : 'resposta válida'
        }`,
        testedAt: response.data.testedAt,
      });

      toast.success('Conexão com o provedor de IA validada com sucesso');
    } catch (error: any) {
      console.error('❌ [AIIntegration] Erro ao testar provedor:', error);
      setLastTestResult({
        status: 'error',
        message: error?.message || 'Erro desconhecido ao testar integração',
        testedAt: new Date().toISOString(),
      });
      toast.error('Falha ao conectar com o provedor de IA');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert className="bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700 text-white">
        <Bot className="h-4 w-4" />
        <AlertTitle>Copiloto Rendizy</AlertTitle>
        <AlertDescription className="text-slate-200 text-sm">
          Configure um provedor de IA para alimentar automações, assistentes e análises dentro do Rendizy. Você pode
          usar sua assinatura do ChatGPT ou qualquer endpoint compatível com o padrão OpenAI.
        </AlertDescription>
      </Alert>

      {loadError && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar configuração</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{loadError}</span>
            <Button
              variant="secondary"
              size="sm"
              className="w-fit"
              onClick={loadRemoteConfig}
            >
              Recarregar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Timeline de Configurações Salvas */}
      {savedConfigs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Configurações Salvas
                </CardTitle>
                <CardDescription>
                  Histórico de integrações de IA configuradas. Você pode ter múltiplas configurações e alternar entre elas.
                </CardDescription>
              </div>
              <Button onClick={handleNewConfig} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Nova Configuração
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {savedConfigs.map((savedConfig) => {
                const providerMeta = PROVIDERS.find((p) => p.id === savedConfig.provider as ProviderId);
                return (
                  <div
                    key={savedConfig.id}
                    className={`p-4 rounded-lg border-2 ${
                      savedConfig.is_active
                        ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                        : 'border-border bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-sm">
                            {savedConfig.name || providerMeta?.name || savedConfig.provider}
                          </h4>
                          {savedConfig.is_active && (
                            <Badge variant="default" className="text-xs bg-green-500 text-white">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Ativa
                            </Badge>
                          )}
                          {!savedConfig.enabled && (
                            <Badge variant="secondary" className="text-xs">
                              Desabilitada
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>
                            <strong>Provedor:</strong> {providerMeta?.name || savedConfig.provider}
                          </p>
                          <p>
                            <strong>Modelo:</strong> {savedConfig.default_model}
                          </p>
                          <p>
                            <strong>Base URL:</strong> {savedConfig.base_url}
                          </p>
                          {savedConfig.notes && (
                            <p>
                              <strong>Notas:</strong> {savedConfig.notes}
                            </p>
                          )}
                          <p className="text-xs opacity-70">
                            Criada em {new Date(savedConfig.created_at).toLocaleString('pt-BR')}
                            {savedConfig.updated_at !== savedConfig.created_at &&
                              ` • Atualizada em ${new Date(savedConfig.updated_at).toLocaleString('pt-BR')}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(savedConfig.id, savedConfig.is_active)}
                          disabled={isLoadingConfigs}
                          title={savedConfig.is_active ? 'Desativar' : 'Ativar'}
                        >
                          {savedConfig.is_active ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditConfig(savedConfig)}
                          disabled={isLoadingConfigs}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteConfig(savedConfig.id)}
                          disabled={isLoadingConfigs}
                          title="Deletar"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card id="ai-config-form">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-500" />
            {editingConfigId ? 'Editar Configuração' : 'Nova Configuração de IA'}
          </CardTitle>
          <CardDescription>
            {editingConfigId
              ? 'Edite os detalhes da configuração selecionada.'
              : 'Crie uma nova integração com um provedor de IA. Esta configuração será salva no histórico.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
            <div>
              <p className="text-sm font-medium text-foreground">Integração Habilitada</p>
              <p className="text-xs text-muted-foreground">
                Quando ativado, os módulos do sistema poderão solicitar respostas a este provedor.
              </p>
            </div>
            <Switch
              checked={config.enabled}
              disabled={disableInputs}
              onCheckedChange={(value) => handleChange('enabled', value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Provedor</Label>
              <select
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={config.provider}
                disabled={disableInputs}
                onChange={(event) => handleProviderChange(event.target.value as ProviderId)}
              >
                {PROVIDERS.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                {providerMeta.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Modelo Padrão</Label>
              <Input
                placeholder="gpt-4o-mini, gpt-4.1, llama3-8b-instruct, etc."
                value={config.defaultModel}
                disabled={disableInputs}
                onChange={(event) => handleChange('defaultModel', event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Esse modelo será usado por padrão em automações. Você pode sobrescrever em cada fluxo.
              </p>
            </div>

            <div className="space-y-2">
              <Label>API Key / Token</Label>
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="Cole aqui sua API Key"
                  value={apiKeyInput}
                  disabled={disableInputs}
                  onChange={(event) => setApiKeyInput(event.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowApiKey(!showApiKey)}
                  disabled={disableInputs}
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {hasRemoteApiKey
                  ? 'API Key já armazenada com segurança. Informe um novo valor apenas se quiser substituí-la.'
                  : 'Sua chave será criptografada no backend Rendizy.'}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Base URL</Label>
              <Input
                placeholder="https://api.openai.com/v1"
                value={config.baseUrl}
                disabled={disableInputs}
                onChange={(event) => handleChange('baseUrl', event.target.value)}
              />
              <p className="text-xs text-muted-foreground">Use endpoint completo para provedores personalizados.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Temperature</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={config.temperature}
                disabled={disableInputs}
                onChange={(event) => handleChange('temperature', Number(event.target.value))}
              />
              <p className="text-xs text-muted-foreground">0 = respostas determinísticas, 1 = mais criativas.</p>
            </div>

            <div className="space-y-2">
              <Label>Máx. Tokens de Resposta</Label>
              <Input
                type="number"
                min="64"
                max="4096"
                value={config.maxTokens}
                disabled={disableInputs}
                onChange={(event) => handleChange('maxTokens', Number(event.target.value))}
              />
              <p className="text-xs text-muted-foreground">Limite máximo por resposta.</p>
            </div>

            <div className="space-y-2">
              <Label>Notas Internas</Label>
              <Input
                placeholder="Ex.: usar apenas para relatórios críticos."
                value={config.notes || ''}
                disabled={disableInputs}
                onChange={(event) => handleChange('notes', event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Prompt Base / Persona</Label>
            <Textarea
              rows={4}
              value={config.promptTemplate}
              disabled={disableInputs}
              onChange={(event) => handleChange('promptTemplate', event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Texto injetado antes de cada chamada. Use para definir personalidade, idioma e políticas.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            Chaves criptografadas via AES-GCM no backend. Em breve: múltiplos provedores por organização.
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="default"
              onClick={handleSave}
              disabled={disableInputs}
              className="min-w-[160px]"
            >
              {isSaving ? (
                <>
                  <Activity className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Salvar Configuração
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={disableTest}
              className="min-w-[180px]"
            >
              {isTesting ? (
                <>
                  <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                  Testando conexão...
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4 mr-2" />
                  Testar provedor
                </>
              )}
            </Button>
          </div>

          {config.lastUpdated && (
            <p className="text-xs text-muted-foreground">
              Última atualização: {new Date(config.lastUpdated).toLocaleString('pt-BR')}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            Resultado do Teste
          </CardTitle>
          <CardDescription>Verifique se o provedor respondeu corretamente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {lastTestResult.status === 'idle' && (
            <Alert variant="default">
              <Info className="h-4 w-4" />
              <AlertDescription>Aguardando teste.</AlertDescription>
            </Alert>
          )}

          {lastTestResult.status === 'success' && (
            <Alert className="border-green-500/40 bg-green-500/10">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-500">Conexão validada</AlertTitle>
              <AlertDescription className="text-green-400">
                {lastTestResult.message || 'Provedor respondeu corretamente.'}
                {lastTestResult.testedAt && (
                  <span className="block text-xs mt-1">
                    Último teste: {new Date(lastTestResult.testedAt).toLocaleString()}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {lastTestResult.status === 'error' && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Falha na conexão</AlertTitle>
              <AlertDescription>
                {lastTestResult.message || 'Não foi possível validar o provedor.'}
                {lastTestResult.testedAt && (
                  <span className="block text-xs mt-1">
                    Tentativa: {new Date(lastTestResult.testedAt).toLocaleString()}
                  </span>
                )}
                <span className="block text-xs mt-2">
                  Dica: confirme a API Key, URL/base e permissões do provedor. Consulte os logs do backend para mais
                  detalhes.
                </span>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="flex items-center gap-1">
              <Bot className="h-3 w-3" />
              Provider: {providerMeta.name}
            </Badge>
            {config.defaultModel && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Link className="h-3 w-3" />
                Modelo: {config.defaultModel}
              </Badge>
            )}
            {config.lastUpdated && (
              <Badge variant="outline">
                Atualizado em {new Date(config.lastUpdated).toLocaleString()}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


