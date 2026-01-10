/**
 * RENDIZY - Integrations Manager
 * 
 * Interface de gerenciamento de integrações com canais externos
 * Exibe cards de canais e abre configuração ao clicar
 * 
 * @version 1.0.103.24
 * @date 2025-10-29
 */

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Building2,
  Globe,
  CreditCard,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Settings,
  BarChart3,
  TrendingUp,
  Bot,
  AlertCircle,
  Save,
  Plus,
  Trash2,
  Package,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import StaysNetIntegration from './StaysNetIntegration'; // Nova arquitetura refatorada
import { BookingComIntegration } from './BookingComIntegration';
import WhatsAppIntegration from './WhatsAppIntegration';
import { AirbnbIntegration } from './AirbnbIntegration';
import { AIIntegration } from './AIIntegration';
import { useAuth } from '../src/contexts/AuthContext';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// ============================================================================
// TYPES
// ============================================================================

interface IntegrationChannel {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  gradientFrom: string;
  gradientTo: string;
  status: 'active' | 'inactive' | 'coming-soon';
  stats?: {
    connected: number;
    active: number;
    inactive: number;
  };
  badge?: {
    text: string;
    variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive';
  };
}

// ============================================================================
// CHANNELS DATA
// ============================================================================

const CHANNELS: IntegrationChannel[] = [
  {
    id: 'staysnet',
    name: 'Stays.net PMS',
    description: 'Property Management System completo',
    icon: Building2,
    iconColor: 'text-white',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-purple-600',
    status: 'active',
    stats: {
      connected: 0,
      active: 0,
      inactive: 0
    },
    badge: {
      text: 'PMS',
      variant: 'default'
    }
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Integração com Evolution API para mensagens',
    icon: Globe,
    iconColor: 'text-white',
    gradientFrom: 'from-green-500',
    gradientTo: 'to-green-600',
    status: 'active', // ✅ REATIVADO v1.0.103.84 - Integração completa com proxy seguro
    stats: {
      connected: 0,
      active: 0,
      inactive: 0
    },
    badge: {
      text: 'NOVO', // ✅ Mudado de 'EM BREVE' para 'NOVO'
      variant: 'success' // ✅ Mudado de 'secondary' para 'success'
    }
  },
  {
    id: 'bookingcom',
    name: 'Booking.com',
    description: 'Canal de distribuição global',
    icon: Globe,
    iconColor: 'text-white',
    gradientFrom: 'from-blue-600',
    gradientTo: 'to-blue-700',
    status: 'active',
    stats: {
      connected: 0,
      active: 0,
      inactive: 0
    },
    badge: {
      text: 'OTA',
      variant: 'secondary'
    }
  },
  {
    id: 'airbnb',
    name: 'Airbnb',
    description: 'Plataforma de aluguel por temporada',
    icon: Building2,
    iconColor: 'text-white',
    gradientFrom: 'from-pink-500',
    gradientTo: 'to-red-500',
    status: 'active', // ✅ ATIVADO para teste de registro de campo financeiro
    stats: {
      connected: 0,
      active: 0,
      inactive: 0
    },
    badge: {
      text: 'NOVO',
      variant: 'success'
    }
  },
  {
    id: 'ai-provider',
    name: 'Provedor de IA',
    description: 'Integra ChatGPT / IA open-source para copilotar o Rendizy',
    icon: Bot,
    iconColor: 'text-white',
    gradientFrom: 'from-purple-500',
    gradientTo: 'to-indigo-500',
    status: 'active',
    stats: {
      connected: 0,
      active: 0,
      inactive: 0
    },
    badge: {
      text: 'Novo',
      variant: 'success'
    }
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Gateway completo (cartão, PIX, boleto e assinaturas) com webhooks e recorrência',
    icon: CreditCard,
    iconColor: 'text-white',
    gradientFrom: 'from-purple-600',
    gradientTo: 'to-indigo-600',
    status: 'active',
    stats: {
      connected: 0,
      active: 0,
      inactive: 0
    },
    badge: {
      text: 'Pagamentos',
      variant: 'secondary'
    }
  },
  {
    id: 'pagarme',
    name: 'Pagar.me',
    description: 'Gateway brasileiro (cartão, PIX e boleto) com foco em taxas e operação local',
    icon: CreditCard,
    iconColor: 'text-white',
    gradientFrom: 'from-green-600',
    gradientTo: 'to-emerald-600',
    status: 'active',
    stats: {
      connected: 0,
      active: 0,
      inactive: 0
    },
    badge: {
      text: 'Pagamentos',
      variant: 'secondary'
    }
  },
  {
    id: 'decolar',
    name: 'Decolar / Despegar',
    description: 'OTA líder na América Latina',
    icon: Globe,
    iconColor: 'text-white',
    gradientFrom: 'from-orange-500',
    gradientTo: 'to-yellow-500',
    status: 'coming-soon',
    badge: {
      text: 'Em Breve',
      variant: 'secondary'
    }
  },
  {
    id: 'vrbo',
    name: 'VRBO',
    description: 'Vacation Rentals by Owner',
    icon: Building2,
    iconColor: 'text-white',
    gradientFrom: 'from-indigo-500',
    gradientTo: 'to-purple-500',
    status: 'coming-soon',
    badge: {
      text: 'Em Breve',
      variant: 'secondary'
    }
  },
  {
    id: 'expedia',
    name: 'Expedia',
    description: 'Portal de viagens global',
    icon: Globe,
    iconColor: 'text-white',
    gradientFrom: 'from-yellow-500',
    gradientTo: 'to-orange-500',
    status: 'coming-soon',
    badge: {
      text: 'Em Breve',
      variant: 'secondary'
    }
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function IntegrationsManager() {
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleChannelClick = (channelId: string) => {
    const channel = CHANNELS.find(c => c.id === channelId);
    if (channel && channel.status !== 'coming-soon') {
      setSelectedChannel(channelId);
      setIsDialogOpen(true);
    }
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setTimeout(() => setSelectedChannel(null), 300);
  };

  const selectedChannelData = CHANNELS.find(c => c.id === selectedChannel);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl text-foreground flex items-center gap-3">
          <Zap className="h-5 w-5 text-purple-400" />
          Integrações
        </h3>
        <p className="text-muted-foreground mt-1">
          Conecte o RENDIZY com canais de distribuição e sistemas externos
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Canais Ativos</p>
                <p className="text-2xl mt-1">
                  {CHANNELS.filter(c => c.status === 'active').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Em Desenvolvimento</p>
                <p className="text-2xl mt-1">
                  {CHANNELS.filter(c => c.status === 'coming-soon').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Disponível</p>
                <p className="text-2xl mt-1">{CHANNELS.length}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Channels Grid */}
      <div>
        <h4 className="text-foreground mb-4 flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Canais Disponíveis
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CHANNELS.map((channel) => {
            const Icon = channel.icon;
            const isDisabled = channel.status === 'coming-soon';

            return (
              <Card
                key={channel.id}
                className={`
                  border-2 transition-all duration-200
                  ${isDisabled 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'cursor-pointer hover:shadow-lg hover:border-blue-300'
                  }
                `}
                onClick={() => !isDisabled && handleChannelClick(channel.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <div className={`
                        w-12 h-12 rounded-lg 
                        bg-gradient-to-br ${channel.gradientFrom} ${channel.gradientTo}
                        flex items-center justify-center
                        ${isDisabled ? 'grayscale' : ''}
                      `}>
                        <Icon className={`w-6 h-6 ${channel.iconColor}`} />
                      </div>
                      
                      {/* Name & Badge */}
                      <div>
                        <CardTitle className="text-base">{channel.name}</CardTitle>
                        {channel.badge && (
                          <Badge 
                            variant={channel.badge.variant as any}
                            className="mt-1"
                          >
                            {channel.badge.text}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Status Icon */}
                    {!isDisabled && (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Description */}
                  <p className="text-sm text-muted-foreground">
                    {channel.description}
                  </p>

                  {/* Stats */}
                  {channel.stats && !isDisabled && (
                    <div className="flex items-center gap-4 pt-2 border-t border-border">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-xs text-muted-foreground">
                          {channel.stats.connected} conectados
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        <span className="text-xs text-muted-foreground">
                          {channel.stats.inactive} inativos
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Coming Soon Message */}
                  {isDisabled && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        🚀 Disponível em breve
                      </p>
                    </div>
                  )}

                  {/* Action Button */}
                  <Button
                    variant={isDisabled ? 'outline' : 'default'}
                    size="sm"
                    className="w-full"
                    disabled={isDisabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isDisabled) handleChannelClick(channel.id);
                    }}
                  >
                    {isDisabled ? 'Em Desenvolvimento' : 'Configurar'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Integration Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedChannelData && (
                <>
                  <div className={`
                    w-10 h-10 rounded-lg 
                    bg-gradient-to-br ${selectedChannelData.gradientFrom} ${selectedChannelData.gradientTo}
                    flex items-center justify-center
                  `}>
                    {React.createElement(selectedChannelData.icon, {
                      className: `w-5 h-5 ${selectedChannelData.iconColor}`
                    })}
                  </div>
                  {selectedChannelData.name}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedChannelData?.description || 'Configure a integração com este canal'}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {/* Render specific integration component */}
            {selectedChannel === 'staysnet' && <StaysNetIntegration />}
            {selectedChannel === 'whatsapp' && <WhatsAppIntegration />}
            {selectedChannel === 'bookingcom' && <BookingComIntegration />}
            {selectedChannel === 'airbnb' && <AirbnbIntegration />}
            {selectedChannel === 'ai-provider' && <AIIntegration />}
            {selectedChannel === 'stripe' && <StripePaymentIntegration />}
            {selectedChannel === 'pagarme' && <PagarmePaymentIntegration />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StripePaymentIntegration() {
  const { isAdmin, isSuperAdmin } = useAuth();
  const canConfigureIntegrations = isAdmin || isSuperAdmin;

  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);

  const [publishableKey, setPublishableKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [restrictedKey, setRestrictedKey] = useState('');
  const [webhookSigningSecret, setWebhookSigningSecret] = useState('');
  const [isTestMode, setIsTestMode] = useState(true);

  const [hasSecretKey, setHasSecretKey] = useState(false);
  const [hasRestrictedKey, setHasRestrictedKey] = useState(false);
  const [hasWebhookSigningSecret, setHasWebhookSigningSecret] = useState(false);
  const [defaultWebhookUrl, setDefaultWebhookUrl] = useState<string>('');
  const [webhookUrl, setWebhookUrl] = useState<string>('');
  const [enabled, setEnabled] = useState<boolean>(false);

  // Products state
  type StripeProduct = {
    id: string;
    name: string;
    description: string | null;
    active: boolean;
    defaultPriceId: string | null;
    metadata: Record<string, string>;
    created: number;
    price: {
      id: string;
      productId: string;
      unitAmount: number;
      currency: string;
      type: 'one_time' | 'recurring';
      recurring: { interval: string; intervalCount: number } | null;
      active: boolean;
    } | null;
  };

  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState<string | null>(null);

  // New product form
  const [newProductName, setNewProductName] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductRecurring, setNewProductRecurring] = useState<'one_time' | 'monthly' | 'yearly'>('one_time');

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setIsLoadingConfig(true);
      setLoadError(null);
      setSaveError(null);

      try {
        const token = localStorage.getItem('rendizy-token');
        if (!token) {
          throw new Error('Token não encontrado. Faça login novamente.');
        }

        const url = `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/settings/stripe`;
        const headers = {
          'X-Auth-Token': token,
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
          'apikey': publicAnonKey,
        } as const;

        const response = await fetch(url, { method: 'GET', headers });
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const cfg = data?.data;
        if (!data?.success || !cfg) {
          throw new Error('Resposta inválida ao carregar configuração do Stripe.');
        }

        if (!mounted) return;

        setEnabled(Boolean(cfg.enabled));
        setIsTestMode(Boolean(cfg.isTestMode));
        setPublishableKey(cfg.publishableKey || '');
        setWebhookUrl(cfg.webhookUrl || '');
        setHasSecretKey(Boolean(cfg.hasSecretKey));
        setHasRestrictedKey(Boolean(cfg.hasRestrictedKey));
        setHasWebhookSigningSecret(Boolean(cfg.hasWebhookSigningSecret));
        setDefaultWebhookUrl(cfg.defaultWebhookUrl || '');
      } catch (err: any) {
        if (!mounted) return;
        setLoadError(err?.message || 'Falha ao carregar configuração do Stripe.');
      } finally {
        if (!mounted) return;
        setIsLoadingConfig(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const saveStripeConfig = async (payload: Record<string, unknown>) => {
    setSaveError(null);
    const token = localStorage.getItem('rendizy-token');
    if (!token) throw new Error('Token não encontrado. Faça login novamente.');

    const url = `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/settings/stripe`;
    const headers = {
      'X-Auth-Token': token,
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`,
      'apikey': publicAnonKey,
    } as const;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const cfg = data?.data;
    if (!data?.success || !cfg) {
      throw new Error('Resposta inválida ao salvar configuração do Stripe.');
    }

    setEnabled(Boolean(cfg.enabled));
    setIsTestMode(Boolean(cfg.isTestMode));
    setPublishableKey(cfg.publishableKey || '');
    setWebhookUrl(cfg.webhookUrl || '');
    setHasSecretKey(Boolean(cfg.hasSecretKey));
    setHasRestrictedKey(Boolean(cfg.hasRestrictedKey));
    setHasWebhookSigningSecret(Boolean(cfg.hasWebhookSigningSecret));
    setDefaultWebhookUrl(cfg.defaultWebhookUrl || '');
  };

  // Products API functions
  const loadProducts = async () => {
    setIsLoadingProducts(true);
    setProductsError(null);
    try {
      const token = localStorage.getItem('rendizy-token');
      if (!token) throw new Error('Token não encontrado.');

      const url = `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/stripe/products`;
      const headers = {
        'X-Auth-Token': token,
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
        'apikey': publicAnonKey,
      } as const;

      const response = await fetch(url, { method: 'GET', headers });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      if (!data?.success) {
        throw new Error(data?.error || 'Falha ao carregar produtos.');
      }

      setProducts(data.data?.products || []);
    } catch (err: any) {
      setProductsError(err?.message || 'Erro ao carregar produtos.');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const createProduct = async () => {
    if (!newProductName.trim()) return;
    const priceValue = parseFloat(newProductPrice.replace(',', '.'));
    if (isNaN(priceValue) || priceValue <= 0) {
      setProductsError('Preço inválido.');
      return;
    }

    setIsCreatingProduct(true);
    setProductsError(null);
    try {
      const token = localStorage.getItem('rendizy-token');
      if (!token) throw new Error('Token não encontrado.');

      const url = `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/stripe/products`;
      const headers = {
        'X-Auth-Token': token,
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
        'apikey': publicAnonKey,
      } as const;

      const payload: any = {
        name: newProductName.trim(),
        description: newProductDescription.trim() || undefined,
        unitAmountCents: Math.round(priceValue * 100),
        currency: 'BRL',
      };

      if (newProductRecurring !== 'one_time') {
        payload.recurring = {
          interval: newProductRecurring === 'monthly' ? 'month' : 'year',
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      if (!data?.success) {
        throw new Error(data?.error || 'Falha ao criar produto.');
      }

      // Clear form and reload
      setNewProductName('');
      setNewProductDescription('');
      setNewProductPrice('');
      setNewProductRecurring('one_time');
      await loadProducts();
    } catch (err: any) {
      setProductsError(err?.message || 'Erro ao criar produto.');
    } finally {
      setIsCreatingProduct(false);
    }
  };

  const archiveProduct = async (productId: string) => {
    setIsDeletingProduct(productId);
    setProductsError(null);
    try {
      const token = localStorage.getItem('rendizy-token');
      if (!token) throw new Error('Token não encontrado.');

      const url = `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/stripe/products/${productId}`;
      const headers = {
        'X-Auth-Token': token,
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
        'apikey': publicAnonKey,
      } as const;

      const response = await fetch(url, { method: 'DELETE', headers });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
      }

      await loadProducts();
    } catch (err: any) {
      setProductsError(err?.message || 'Erro ao arquivar produto.');
    } finally {
      setIsDeletingProduct(null);
    }
  };

  const formatPrice = (cents: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Documentação:</strong> Consulte o guia completo em{' '}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">
            docs/06-integrations/API_STRIPE_REFERENCE.md
          </code>
        </AlertDescription>
      </Alert>

      {(isLoadingConfig || loadError || saveError) && (
        <Alert variant={loadError || saveError ? 'destructive' : 'default'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {isLoadingConfig
              ? 'Carregando configuração do Stripe...'
              : (loadError || saveError || 'OK')}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Dores resolvidas</p>
            <p className="text-sm text-muted-foreground">
              O que essa integração elimina no dia a dia (operação e financeiro)
            </p>
          </div>
          <Badge variant="secondary">Multi-tenant</Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Checkout e cobrança padronizados</Badge>
          <Badge variant="outline">Confirmação automática via webhook</Badge>
          <Badge variant="outline">Menos conciliação manual</Badge>
          <Badge variant="outline">Reembolso e estorno rastreáveis</Badge>
          <Badge variant="outline">Assinaturas e recorrência</Badge>
        </div>

        <div className="text-sm text-muted-foreground">
          {canConfigureIntegrations ? (
            <p>
              Como <strong>Admin</strong>, você configura credenciais e ativa recursos. A operação usa as soluções
              abaixo no dia a dia.
            </p>
          ) : (
            <p>
              Como <strong>usuário da operação</strong>, você consome as soluções já habilitadas pelo Admin (pagamentos,
              reembolsos, assinaturas e status).
            </p>
          )}
        </div>
      </div>

      <Tabs defaultValue="credentials" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="credentials">Credenciais</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
          <TabsTrigger value="solutions">Roadmap</TabsTrigger>
        </TabsList>

        <TabsContent value="credentials" className="space-y-4 mt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stripe-publishable-key">Publishable Key</Label>
              <Input
                id="stripe-publishable-key"
                placeholder="pk_test_... ou pk_live_..."
                value={publishableKey}
                onChange={(e) => setPublishableKey(e.target.value)}
                disabled={!canConfigureIntegrations || isLoadingConfig || isSavingCredentials}
              />
              <p className="text-xs text-muted-foreground">Chave pública para uso no frontend (Stripe.js)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stripe-secret-key">Secret Key</Label>
              <Input
                id="stripe-secret-key"
                type="password"
                placeholder={hasSecretKey ? 'Já configurada (preencha para substituir)' : 'sk_test_... ou sk_live_...'}
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                disabled={!canConfigureIntegrations || isLoadingConfig || isSavingCredentials}
              />
              <p className="text-xs text-muted-foreground">
                Chave secreta para uso no backend (nunca exponha no frontend)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stripe-restricted-key">Restricted Key (Opcional)</Label>
              <Input
                id="stripe-restricted-key"
                type="password"
                placeholder={hasRestrictedKey ? 'Já configurada (preencha para substituir)' : 'rk_test_... ou rk_live_...'}
                value={restrictedKey}
                onChange={(e) => setRestrictedKey(e.target.value)}
                disabled={!canConfigureIntegrations || isLoadingConfig || isSavingCredentials}
              />
              <p className="text-xs text-muted-foreground">Chave com permissões limitadas para maior segurança</p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="stripe-test-mode"
                checked={isTestMode}
                onCheckedChange={setIsTestMode}
                disabled={!canConfigureIntegrations || isLoadingConfig || isSavingCredentials}
              />
              <Label htmlFor="stripe-test-mode" className="cursor-pointer">Modo de Teste (Sandbox)</Label>
            </div>

            <Button
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={!canConfigureIntegrations || isLoadingConfig || isSavingCredentials}
              onClick={async () => {
                try {
                  setIsSavingCredentials(true);
                  await saveStripeConfig({
                    enabled: true,
                    isTestMode,
                    publishableKey,
                    secretKey: secretKey.trim() ? secretKey.trim() : undefined,
                    restrictedKey: restrictedKey.trim() ? restrictedKey.trim() : undefined,
                  });
                  setSecretKey('');
                  setRestrictedKey('');
                } catch (err: any) {
                  setSaveError(err?.message || 'Falha ao salvar credenciais.');
                } finally {
                  setIsSavingCredentials(false);
                }
              }}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSavingCredentials ? 'Salvando...' : 'Salvar Credenciais'}
            </Button>

            <p className="text-xs text-muted-foreground">
              Status atual: {enabled && hasSecretKey ? 'Ativo' : 'Inativo'}
            </p>
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4 mt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stripe-webhook-secret">Webhook Signing Secret</Label>
              <Input
                id="stripe-webhook-secret"
                type="password"
                placeholder={hasWebhookSigningSecret ? 'Já configurado (preencha para substituir)' : 'whsec_...'}
                value={webhookSigningSecret}
                onChange={(e) => setWebhookSigningSecret(e.target.value)}
                disabled={!canConfigureIntegrations || isLoadingConfig || isSavingWebhook}
              />
              <p className="text-xs text-muted-foreground">Secret para validar a autenticidade dos eventos do Stripe</p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-semibold">Configure o webhook no Stripe Dashboard:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Acesse: https://dashboard.stripe.com/webhooks</li>
                    <li>Clique em "Add endpoint"</li>
                    <li>
                      URL:{' '}
                      <code className="bg-muted px-1 py-0.5 rounded">
                        {webhookUrl || defaultWebhookUrl || 'Carregando...'}
                      </code>
                    </li>
                    <li>
                      Eventos recomendados:
                      <ul className="list-disc list-inside ml-4 mt-1">
                        <li>payment_intent.succeeded</li>
                        <li>payment_intent.payment_failed</li>
                        <li>charge.refunded</li>
                        <li>customer.subscription.created</li>
                        <li>customer.subscription.updated</li>
                        <li>customer.subscription.deleted</li>
                      </ul>
                    </li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>

            <Button
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={!canConfigureIntegrations || isLoadingConfig || isSavingWebhook}
              onClick={async () => {
                try {
                  setIsSavingWebhook(true);
                  await saveStripeConfig({
                    webhookSigningSecret: webhookSigningSecret.trim() ? webhookSigningSecret.trim() : undefined,
                    webhookUrl: (webhookUrl || defaultWebhookUrl || '').trim() || undefined,
                  });
                  setWebhookSigningSecret('');
                } catch (err: any) {
                  setSaveError(err?.message || 'Falha ao salvar webhook secret.');
                } finally {
                  setIsSavingWebhook(false);
                }
              }}
            >
              <Save className="w-4 h-4 mr-2" />
              {isSavingWebhook ? 'Salvando...' : 'Salvar Webhook Secret'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4 mt-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Produtos e Preços
                </h4>
                <p className="text-sm text-muted-foreground">
                  Crie produtos diretamente via API (zero dashboard Stripe)
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadProducts}
                disabled={isLoadingProducts || !enabled}
              >
                {isLoadingProducts ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Atualizar'}
              </Button>
            </div>

            {!enabled && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Configure as credenciais do Stripe primeiro para gerenciar produtos.
                </AlertDescription>
              </Alert>
            )}

            {productsError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{productsError}</AlertDescription>
              </Alert>
            )}

            {/* Create Product Form */}
            {enabled && canConfigureIntegrations && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Produto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="product-name">Nome do Produto *</Label>
                      <Input
                        id="product-name"
                        placeholder="Ex: Plano Premium, Taxa de Limpeza..."
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        disabled={isCreatingProduct}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="product-price">Preço (R$) *</Label>
                      <Input
                        id="product-price"
                        placeholder="99,90"
                        value={newProductPrice}
                        onChange={(e) => setNewProductPrice(e.target.value)}
                        disabled={isCreatingProduct}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="product-description">Descrição (opcional)</Label>
                    <Input
                      id="product-description"
                      placeholder="Descrição do produto..."
                      value={newProductDescription}
                      onChange={(e) => setNewProductDescription(e.target.value)}
                      disabled={isCreatingProduct}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Cobrança</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="recurring"
                          checked={newProductRecurring === 'one_time'}
                          onChange={() => setNewProductRecurring('one_time')}
                          disabled={isCreatingProduct}
                        />
                        <span className="text-sm">Único</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="recurring"
                          checked={newProductRecurring === 'monthly'}
                          onChange={() => setNewProductRecurring('monthly')}
                          disabled={isCreatingProduct}
                        />
                        <span className="text-sm">Mensal</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="recurring"
                          checked={newProductRecurring === 'yearly'}
                          onChange={() => setNewProductRecurring('yearly')}
                          disabled={isCreatingProduct}
                        />
                        <span className="text-sm">Anual</span>
                      </label>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={createProduct}
                    disabled={isCreatingProduct || !newProductName.trim() || !newProductPrice.trim()}
                  >
                    {isCreatingProduct ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Criar Produto
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Products List */}
            {enabled && (
              <div className="space-y-3">
                <h5 className="font-medium text-sm">Produtos Cadastrados ({products.length})</h5>
                
                {isLoadingProducts ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum produto cadastrado ainda.</p>
                    <p className="text-sm">Crie seu primeiro produto acima.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {products.map((product) => (
                      <Card key={product.id} className="relative">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h6 className="font-medium truncate">{product.name}</h6>
                              {product.description && (
                                <p className="text-xs text-muted-foreground truncate">{product.description}</p>
                              )}
                              {product.price && (
                                <div className="mt-1 flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {formatPrice(product.price.unitAmount, product.price.currency)}
                                    {product.price.recurring && (
                                      <span className="ml-1">
                                        /{product.price.recurring.interval === 'month' ? 'mês' : 'ano'}
                                      </span>
                                    )}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {product.price.type === 'recurring' ? 'Recorrente' : 'Único'}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            {canConfigureIntegrations && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => archiveProduct(product.id)}
                                disabled={isDeletingProduct === product.id}
                              >
                                {isDeletingProduct === product.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            ID: <code className="bg-muted px-1 py-0.5 rounded">{product.id}</code>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Aceitar PIX</Label>
                <p className="text-sm text-muted-foreground">Habilitar pagamentos via PIX (Brasil)</p>
              </div>
              <Switch defaultChecked />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Aceitar Boleto</Label>
                <p className="text-sm text-muted-foreground">Habilitar pagamentos via boleto bancário</p>
              </div>
              <Switch />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Captura Automática</Label>
                <p className="text-sm text-muted-foreground">Capturar pagamentos automaticamente após autorização</p>
              </div>
              <Switch defaultChecked />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Assinaturas Recorrentes</Label>
                <p className="text-sm text-muted-foreground">
                  Habilitar planos de assinatura (Free, Basic, Premium, Enterprise)
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <Alert className="bg-purple-50 border-purple-200">
              <Zap className="h-4 w-4 text-purple-600" />
              <AlertDescription>
                <strong className="text-purple-900">Recursos avançados:</strong> Consulte a documentação completa para
                implementar Split Payments, Connect Platform e Issuing.
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>

        <TabsContent value="solutions" className="space-y-4 mt-4">
          <Alert className="bg-purple-50 border-purple-200">
            <BarChart3 className="h-4 w-4 text-purple-700" />
            <AlertDescription>
              <strong className="text-purple-900">Roadmap Stripe (organizado):</strong> vamos implementar por fases,
              começando por <strong>Checkout</strong> (prioridade). Depois entramos com <strong>Payment Links</strong> e
              <strong> Invoicing</strong> para cenários de cobrança. Splits entram por último.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span>1) Checkout (Cartão crédito/débito)</span>
                  <Badge className="bg-purple-600 text-white">P1</Badge>
                </CardTitle>
                <CardDescription>Pagamento imediato para reservas: UX padronizada + confirmação por webhook.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>Objetivo:</strong> “reserva paga agora” com menor fricção e alta confiabilidade.</p>
                <p><strong>Inclui:</strong> Checkout + cartões (crédito/débito) e base para métodos locais (PIX/Boleto) no mesmo fluxo.</p>
                <p><strong>Eventos chave:</strong> <code className="text-xs bg-muted px-1 py-0.5 rounded">checkout.session.completed</code>,{' '}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">payment_intent.succeeded</code>,{' '}
                  <code className="text-xs bg-muted px-1 py-0.5 rounded">payment_intent.payment_failed</code>.</p>
                <p><strong>Dados que precisamos guardar:</strong> reserva ↔ session_id ↔ payment_intent_id ↔ status.</p>
                {canConfigureIntegrations ? (
                  <p><strong>Admin:</strong> configure credenciais + webhook secret; defina captura automática conforme o fluxo.</p>
                ) : (
                  <p><strong>Operação:</strong> acompanhe status (pago/pendente/falhou) e libere/segure a reserva conforme regra.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span>2) Payment Links</span>
                  <Badge variant="secondary">P2</Badge>
                </CardTitle>
                <CardDescription>Cobrar depois por WhatsApp/e-mail sem depender de UI no app.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>Objetivo:</strong> “cobrar depois / por mensagem” (entrada, saldo, extras, cobrança manual).</p>
                <p><strong>Como funciona:</strong> gerar um link e enviar ao cliente; o Stripe cuida do checkout.</p>
                <p><strong>Eventos chave:</strong> os mesmos do Checkout (pagamento confirmado via webhook).</p>
                <p><strong>Dados que precisamos guardar:</strong> link ↔ reserva ↔ status ↔ valor/itens cobrados.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span>3) Invoicing (Faturas)</span>
                  <Badge variant="secondary">P3</Badge>
                </CardTitle>
                <CardDescription>Contas a receber formal: vencimento, status e gestão de cobrança.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>Objetivo:</strong> “conta a receber” (pós-estadia, empresas, caução, extras com vencimento).</p>
                <p><strong>Como funciona:</strong> emitir fatura e acompanhar o ciclo (aberta/paga/vencida).</p>
                <p><strong>Eventos chave:</strong> ciclo de invoice (criada, paga, vencida) + pagamento confirmado.</p>
                <p><strong>Dados que precisamos guardar:</strong> invoice_id ↔ reserva ↔ status ↔ prazos.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span>PIX (como método no Checkout)</span>
                  <Badge variant="outline">P1 (método)</Badge>
                </CardTitle>
                <CardDescription>Pagamento instantâneo no Brasil, dentro do checkout padronizado.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>Objetivo:</strong> reduzir abandono oferecendo método local.</p>
                {canConfigureIntegrations ? (
                  <p><strong>Admin:</strong> ative “Aceitar PIX” e valide elegibilidade da conta para BR.</p>
                ) : (
                  <p><strong>Operação:</strong> pagamento pode ser confirmado rapidamente; acompanhe via status/webhook.</p>
                )}
                <p className="text-muted-foreground"><strong>Nota:</strong> confirmação é por evento (não por “print” do cliente).</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span>Boleto (como método no Checkout / Links / Faturas)</span>
                  <Badge variant="outline">P1–P3 (método)</Badge>
                </CardTitle>
                <CardDescription>Voucher bancário com confirmação assíncrona (útil para público sem cartão).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>Objetivo:</strong> permitir cobrança offline e com menor risco de chargeback.</p>
                <p className="text-muted-foreground"><strong>Ponto-chave:</strong> sem reembolso nativo no Stripe; devoluções são “por fora” (processo interno).</p>
                {canConfigureIntegrations ? (
                  <p><strong>Admin:</strong> ative “Aceitar Boleto” e garanta webhooks para confirmação.</p>
                ) : (
                  <p><strong>Operação:</strong> acompanhe “pendente” até compensar; defina regras de expiração/hold da reserva.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-2 text-base">
                  <span>4+) Splits (por último)</span>
                  <Badge variant="secondary">Roadmap</Badge>
                </CardTitle>
                <CardDescription>Entram quando estivermos maduros com o Stripe (mais regras e conciliação).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>Split interno:</strong> separação contábil (taxa vs aluguel) sem repassar para terceiros.</p>
                <p><strong>Marketplace (Connect):</strong> repasse para hosts/proprietários (mais complexo).</p>
                <p className="text-muted-foreground">
                  <strong>Observação BR:</strong> em transfers, <code className="text-xs bg-muted px-1 py-0.5 rounded">source_transaction</code> tende a ser obrigatório → precisamos amarrar repasses a uma cobrança específica.
                </p>
              </CardContent>
            </Card>
          </div>

          <Alert className="bg-purple-50 border-purple-200">
            <AlertCircle className="h-4 w-4 text-purple-700" />
            <AlertDescription>
              <strong>Processo ponta-a-ponta (padrão):</strong> 1) criar sessão/link/fatura → 2) cliente paga → 3) webhook confirma
              → 4) atualizar reserva/financeiro → 5) conciliar e auditar.
            </AlertDescription>
          </Alert>

          <Alert className="bg-purple-50 border-purple-200">
            <AlertCircle className="h-4 w-4 text-purple-700" />
            <AlertDescription>
              <strong>Importante:</strong> as soluções dependem de Webhooks e idempotência. Veja os eventos recomendados
              na aba <strong>Webhooks</strong> e o playbook no guia Stripe.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PagarmePaymentIntegration() {
  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Taxas competitivas:</strong> O Pagar.me oferece boas taxas para o mercado brasileiro e suporte a PIX,
          cartão e boleto.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="credentials" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="credentials">Credenciais</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="credentials" className="space-y-4 mt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pagarme-api-key">API Key</Label>
              <Input id="pagarme-api-key" placeholder="ak_test_... ou ak_live_..." />
              <p className="text-xs text-muted-foreground">
                Chave de API do Pagar.me (Dashboard → Configurações → Chaves de API)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pagarme-encryption-key">Encryption Key</Label>
              <Input id="pagarme-encryption-key" type="password" placeholder="ek_test_... ou ek_live_..." />
              <p className="text-xs text-muted-foreground">Chave de criptografia para uso no frontend (Checkout)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pagarme-recipient-id">Recipient ID (Opcional)</Label>
              <Input id="pagarme-recipient-id" placeholder="re_..." />
              <p className="text-xs text-muted-foreground">ID do recebedor para split de pagamento (marketplace)</p>
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Switch id="pagarme-test-mode" defaultChecked />
              <Label htmlFor="pagarme-test-mode" className="cursor-pointer">Modo de Teste (Sandbox)</Label>
            </div>

            <Button className="w-full bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              Salvar Credenciais
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4 mt-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Configure o webhook no dashboard do Pagar.me apontando para sua URL de backend (conforme seu ambiente).
            </AlertDescription>
          </Alert>

          <Button className="w-full bg-green-600 hover:bg-green-700">
            <Save className="w-4 h-4 mr-2" />
            Salvar Configuração de Webhook
          </Button>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Aceitar PIX</Label>
                <p className="text-sm text-muted-foreground">Habilitar pagamentos via PIX</p>
              </div>
              <Switch defaultChecked />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Aceitar Boleto</Label>
                <p className="text-sm text-muted-foreground">Habilitar pagamentos via boleto bancário</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}