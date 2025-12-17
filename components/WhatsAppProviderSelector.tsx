/**
 * WHATSAPP PROVIDER SELECTOR
 * 
 * Componente para escolher qual provider WhatsApp usar:
 * - Evolution API
 * - WAHA
 * 
 * Permite trocar em runtime e testar ambos
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Settings,
  Zap,
  Shield,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import type { WhatsAppProvider } from '../utils/whatsapp/types';
import { getProvidersStatus, switchProvider, WhatsAppProviderFactory } from '../utils/whatsapp';

interface ProviderStatus {
  name: WhatsAppProvider;
  enabled: boolean;
  baseUrl: string;
  healthy: boolean;
  status: string;
  error?: string;
}

export function WhatsAppProviderSelector() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<WhatsAppProvider>('waha');
  const [testing, setTesting] = useState<WhatsAppProvider | null>(null);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    setLoading(true);
    try {
      const status = await getProvidersStatus();
      setProviders(status);
    } catch (error) {
      console.error('Erro ao carregar providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProvider = (provider: WhatsAppProvider) => {
    setSelectedProvider(provider);
    switchProvider(provider);
  };

  const handleTestProvider = async (provider: WhatsAppProvider) => {
    setTesting(provider);
    try {
      const instance = WhatsAppProviderFactory.getInstance(provider);
      const health = await instance.healthCheck();
      
      if (health.healthy) {
        alert(`✅ ${provider.toUpperCase()} está funcionando!`);
      } else {
        alert(`❌ ${provider.toUpperCase()} não está respondendo`);
      }
    } catch (error) {
      alert(`❌ Erro ao testar ${provider}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setTesting(null);
      loadProviders();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="size-6 animate-spin" />
          <span className="ml-2">Carregando providers...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="size-5" />
            Selecionar Provider WhatsApp
          </CardTitle>
          <CardDescription>
            Escolha qual API usar para conectar com WhatsApp. Você pode trocar a qualquer momento.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Comparação Rápida */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.name}
            provider={provider}
            isSelected={selectedProvider === provider.name}
            isTesting={testing === provider.name}
            onSelect={() => handleSelectProvider(provider.name)}
            onTest={() => handleTestProvider(provider.name)}
          />
        ))}
      </div>

      {/* Provider Ativo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-5" />
            Provider Ativo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg uppercase">{selectedProvider}</h3>
              <p className="text-sm text-muted-foreground">
                {selectedProvider === 'evolution' && 'Evolution API - API não oficial'}
                {selectedProvider === 'waha' && 'WAHA - WhatsApp HTTP API (estável)'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadProviders}
            >
              <RefreshCw className="size-4 mr-2" />
              Atualizar Status
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configurações Avançadas */}
      <Tabs defaultValue="status">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="info">Informações</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status Detalhado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {providers.map((provider) => (
                  <div key={provider.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {provider.healthy ? (
                        <CheckCircle2 className="size-5 text-green-500" />
                      ) : (
                        <XCircle className="size-5 text-red-500" />
                      )}
                      <div>
                        <h4 className="font-medium uppercase">{provider.name}</h4>
                        <p className="text-sm text-muted-foreground">{provider.baseUrl}</p>
                        {provider.error && (
                          <p className="text-sm text-red-500">{provider.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={provider.enabled ? 'default' : 'secondary'}>
                        {provider.enabled ? 'Habilitado' : 'Desabilitado'}
                      </Badge>
                      <Badge variant={provider.healthy ? 'default' : 'destructive'}>
                        {provider.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configuração</CardTitle>
              <CardDescription>
                Para alterar configurações, edite os arquivos em <code>/utils/whatsapp/</code>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="size-4" />
                <AlertDescription>
                  <strong>Evolution:</strong> Desabilitado devido a erro 401 persistente com API Key inválida.
                  <br />
                  <strong>WAHA:</strong> Deploy na VPS Hostinger (whatsapp.suacasaavenda.com.br)
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Arquitetura</h4>
                <p className="text-sm text-muted-foreground">
                  Multi-Provider Factory Pattern
                </p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Estrutura de Arquivos</h4>
                <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
{`utils/whatsapp/
├── types.ts              → Tipos compartilhados
├── factory.ts            → Factory para escolher provider
├── index.ts              → Entry point
├── evolution/
│   ├── api.ts           → Evolution API
│   └── config.ts        → Config Evolution
└── waha/
    ├── api.ts           → WAHA API
    └── config.ts        → Config WAHA`}
                </pre>
              </div>

              <div>
                <h4 className="font-medium mb-2">Como Usar</h4>
                <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
{`import { getDefaultProvider } from './utils/whatsapp';

const whatsapp = getDefaultProvider();
const qr = await whatsapp.getQRCode();
await whatsapp.sendTextMessage('5511999999999', 'Olá!');`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// PROVIDER CARD
// ============================================================

interface ProviderCardProps {
  provider: ProviderStatus;
  isSelected: boolean;
  isTesting: boolean;
  onSelect: () => void;
  onTest: () => void;
}

function ProviderCard({
  provider,
  isSelected,
  isTesting,
  onSelect,
  onTest,
}: ProviderCardProps) {
  return (
    <Card className={isSelected ? 'border-primary' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="uppercase">{provider.name}</CardTitle>
          {provider.healthy ? (
            <CheckCircle2 className="size-5 text-green-500" />
          ) : (
            <XCircle className="size-5 text-red-500" />
          )}
        </div>
        <CardDescription>
          {provider.name === 'evolution' && 'Evolution API - API não oficial'}
          {provider.name === 'waha' && 'WAHA - WhatsApp HTTP API'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">URL:</span>
            <code className="text-xs">{provider.baseUrl.replace('https://', '')}</code>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status:</span>
            <Badge variant={provider.healthy ? 'default' : 'destructive'}>
              {provider.status}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Habilitado:</span>
            <Badge variant={provider.enabled ? 'default' : 'secondary'}>
              {provider.enabled ? 'Sim' : 'Não'}
            </Badge>
          </div>
        </div>

        {/* Error */}
        {provider.error && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertDescription className="text-xs">
              {provider.error}
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={onSelect}
            className="flex-1"
            disabled={!provider.enabled}
          >
            {isSelected ? 'Selecionado' : 'Selecionar'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onTest}
            disabled={isTesting}
          >
            {isTesting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Settings className="size-4" />
            )}
          </Button>
        </div>

        {/* Info específica */}
        {provider.name === 'evolution' && !provider.enabled && (
          <Alert>
            <AlertTriangle className="size-4" />
            <AlertDescription className="text-xs">
              Desabilitado: Erro 401 persistente com API Key inválida
            </AlertDescription>
          </Alert>
        )}

        {provider.name === 'waha' && provider.enabled && (
          <Alert>
            <CheckCircle2 className="size-4" />
            <AlertDescription className="text-xs">
              ✅ Deploy na VPS Hostinger - Custo adicional: $0
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
