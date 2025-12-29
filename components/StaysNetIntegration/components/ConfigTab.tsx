/**
 * StaysNet Integration - Config Tab Component
 * Configuration tab for API credentials
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Alert, AlertDescription } from '../../ui/alert';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { LoadingButton } from './LoadingButton';
import {
  Key,
  Globe,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  AlertTriangle,
  Copy,
} from 'lucide-react';
import type { StaysNetConfig, ValidationResult, ConnectionStatus } from '../types';
import { projectId } from '../../../utils/supabase/info';

interface ConfigTabProps {
  config: StaysNetConfig;
  onConfigChange: (config: StaysNetConfig) => void;
  onSave: () => Promise<void>;
  onTestConnection: () => Promise<void>;
  isSaving: boolean;
  isTesting: boolean;
  urlValidation: ValidationResult;
  configValidation: ValidationResult;
  connectionStatus: ConnectionStatus;
  onAutoFix: () => void;
}

export function ConfigTab({
  config,
  onConfigChange,
  onSave,
  onTestConnection,
  isSaving,
  isTesting,
  urlValidation,
  configValidation,
  connectionStatus,
  onAutoFix,
}: ConfigTabProps) {
  const [showApiKey, setShowApiKey] = React.useState(false);
  const [showApiSecret, setShowApiSecret] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const webhookUrl = React.useMemo(() => {
    const explicit = String(config.notificationWebhookUrl || '').trim();
    if (explicit) return explicit;
    return `https://${projectId}.supabase.co/functions/v1/staysnet-webhook-receiver/<ORG_ID>`;
  }, [config.notificationWebhookUrl]);

  const handleCopyWebhook = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop: clipboard pode falhar em alguns navegadores/HTTP
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Credenciais da API</CardTitle>
          <CardDescription>
            Configure as credenciais para conectar com a API do Stays.net
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key / Login *</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="apiKey"
                type={showApiKey ? 'text' : 'password'}
                value={config.apiKey}
                onChange={(e) => onConfigChange({ ...config, apiKey: e.target.value })}
                placeholder="Sua API Key ou Login"
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* API Secret (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="apiSecret">API Secret / Senha (opcional)</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="apiSecret"
                type={showApiSecret ? 'text' : 'password'}
                value={config.apiSecret || ''}
                onChange={(e) => onConfigChange({ ...config, apiSecret: e.target.value })}
                placeholder="Senha ou Secret (se necessário)"
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiSecret(!showApiSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showApiSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Base URL */}
          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL *</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="baseUrl"
                value={config.baseUrl}
                onChange={(e) => onConfigChange({ ...config, baseUrl: e.target.value })}
                placeholder="https://stays.net/external-api"
                className="pl-10"
              />
            </div>
            {urlValidation.status !== 'idle' && (
              <div className="flex items-center gap-2">
                {urlValidation.status === 'correct' && (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    URL válida
                  </Badge>
                )}
                {urlValidation.status === 'fixable' && (
                  <>
                    <Badge variant="default" className="bg-yellow-500">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Pode ser corrigida
                    </Badge>
                    <button
                      onClick={onAutoFix}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Corrigir automaticamente
                    </button>
                  </>
                )}
                {urlValidation.status === 'invalid' && (
                  <Badge variant="destructive">
                    <XCircle className="w-3 h-3 mr-1" />
                    {urlValidation.message}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Webhook URL */}
          <div className="space-y-2">
            <Label htmlFor="notificationWebhookUrl">Webhook URL (colar no Stays)</Label>
            <div className="flex gap-2">
              <Input
                id="notificationWebhookUrl"
                value={webhookUrl}
                readOnly
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyWebhook}
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Se aparecer <code>{'<ORG_ID>'}</code>, salve a configuração para o backend preencher automaticamente.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            <LoadingButton
              variant="outline"
              onClick={onTestConnection}
              isLoading={isTesting}
              loadingText="Testando..."
              disabled={!config.apiKey || !config.baseUrl || urlValidation.status === 'invalid'}
              icon={<RefreshCw className="w-4 h-4 mr-2" />}
            >
              Testar Conexão
            </LoadingButton>

            <LoadingButton
              onClick={onSave}
              isLoading={isSaving}
              loadingText="Salvando..."
              disabled={!config.apiKey || !config.baseUrl}
              icon={<CheckCircle2 className="w-4 h-4 mr-2" />}
            >
              Salvar Configuração
            </LoadingButton>
          </div>
        </CardContent>
      </Card>

      {/* Connection Status */}
      {connectionStatus.status !== 'idle' && (
        <Alert variant={connectionStatus.status === 'success' ? 'default' : 'destructive'}>
          {connectionStatus.status === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            {connectionStatus.message}
            {connectionStatus.timestamp && (
              <span className="block text-xs text-slate-500 mt-1">
                {new Date(connectionStatus.timestamp).toLocaleString()}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📚 Documentação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <p>
            <strong>API Key:</strong> Obtenha suas credenciais no painel do Stays.net
          </p>
          <p>
            <strong>Base URL:</strong> Geralmente https://stays.net/external-api
          </p>
          <p>
            <strong>Teste de Conexão:</strong> Valida se as credenciais estão corretas
          </p>
          <p>
            <strong>Webhook:</strong> Configure no Stays para acionar o robô (receiver) e manter bloqueios/reservas sincronizados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
