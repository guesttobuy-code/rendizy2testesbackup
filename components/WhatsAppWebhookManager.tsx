/**
 * RENDIZY - WhatsApp Webhook Manager
 * 
 * @figma@ - Criado em 06/11/2025 (v1.0.103.322)
 * 
 * SISTEMA COMPLETO DE WEBHOOKS EVOLUTION API:
 * ✅ Configuração automática de webhook na Evolution API
 * ✅ Monitoramento de status do webhook
 * ✅ Visualização de eventos recebidos em tempo real
 * ✅ Configuração de eventos a serem monitorados (19 tipos)
 * ✅ Interface visual completa com scrollable lists
 * ✅ Persistência no KV Store com tenant isolation
 * 
 * ARQUITETURA:
 * - Frontend: Este componente (545 linhas)
 * - Backend: 4 rotas em routes-whatsapp-evolution-complete.ts
 * - Storage: KV Store (whatsapp:webhook:*)
 * 
 * @version 1.0.103.322
 * @date 2025-11-06
 * @author Figma Make AI
 */

import React, { useState, useEffect } from 'react';
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
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import {
  Webhook,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Copy,
  RefreshCw,
  Eye,
  Trash2,
  Zap,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// ============================================================================
// TYPES
// ============================================================================

interface WebhookEvent {
  event: string;
  data: any;
  receivedAt?: string;
  updatedAt?: string;
}

interface WebhookConfig {
  enabled: boolean;
  url: string;
  webhookByEvents: boolean;
  webhookBase64: boolean;
  events: string[];
  configuredAt?: string;
}

interface WebhookStatus {
  enabled: boolean;
  configured: boolean;
  url?: string;
  events?: string[];
}

// ============================================================================
// EVENTOS DISPONÍVEIS
// ============================================================================

const AVAILABLE_EVENTS = [
  { name: 'APPLICATION_STARTUP', label: 'Inicialização', description: 'Quando a aplicação inicia' },
  { name: 'QRCODE_UPDATED', label: 'QR Code', description: 'Quando QR Code é atualizado' },
  { name: 'MESSAGES_SET', label: 'Mensagens (Set)', description: 'Conjunto de mensagens' },
  { name: 'MESSAGES_UPSERT', label: 'Mensagens (Nova)', description: 'Nova mensagem recebida' },
  { name: 'MESSAGES_UPDATE', label: 'Mensagens (Update)', description: 'Mensagem atualizada' },
  { name: 'SEND_MESSAGE', label: 'Envio', description: 'Mensagem enviada' },
  { name: 'CHATS_SET', label: 'Chats (Set)', description: 'Conjunto de chats' },
  { name: 'CHATS_UPSERT', label: 'Chats (Novo)', description: 'Novo chat criado' },
  { name: 'CHATS_UPDATE', label: 'Chats (Update)', description: 'Chat atualizado' },
  { name: 'CHATS_DELETE', label: 'Chats (Delete)', description: 'Chat deletado' },
  { name: 'CONTACTS_SET', label: 'Contatos (Set)', description: 'Conjunto de contatos' },
  { name: 'CONTACTS_UPSERT', label: 'Contatos (Novo)', description: 'Novo contato' },
  { name: 'CONTACTS_UPDATE', label: 'Contatos (Update)', description: 'Contato atualizado' },
  { name: 'PRESENCE_UPDATE', label: 'Presença', description: 'Status de presença' },
  { name: 'CONNECTION_UPDATE', label: 'Conexão', description: 'Status de conexão' },
  { name: 'GROUPS_UPSERT', label: 'Grupos (Novo)', description: 'Novo grupo' },
  { name: 'GROUP_UPDATE', label: 'Grupos (Update)', description: 'Grupo atualizado' },
  { name: 'GROUP_PARTICIPANTS_UPDATE', label: 'Participantes', description: 'Membros do grupo' },
  { name: 'CALL', label: 'Chamadas', description: 'Chamadas recebidas' },
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WhatsAppWebhookManager() {
  const [loading, setLoading] = useState(true);
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus | null>(null);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<string[]>(
    AVAILABLE_EVENTS.map(e => e.name)
  );
  const [webhookByEvents, setWebhookByEvents] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // URL do webhook (rota correta: /chat/channels/whatsapp/webhook)
  const webhookUrl = `https://${projectId}.supabase.co/functions/v1/rendizy-server/chat/channels/whatsapp/webhook`;

  useEffect(() => {
    loadWebhookStatus();
    loadWebhookEvents();
  }, []);

  // ============================================================================
  // CARREGAR STATUS DO WEBHOOK
  // ============================================================================

  const loadWebhookStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/whatsapp/webhook/status`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const result = await response.json();
      
      if (result.success && result.data) {
        setWebhookStatus(result.data);
        
        // Atualizar eventos selecionados se webhook já configurado
        if (result.data.events && result.data.events.length > 0) {
          setSelectedEvents(result.data.events);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar status do webhook:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // CARREGAR EVENTOS RECEBIDOS
  // ============================================================================

  const loadWebhookEvents = async () => {
    try {
      setLoadingEvents(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/whatsapp/webhook/events`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const result = await response.json();
      
      if (result.success && result.data) {
        setWebhookEvents(result.data);
      }
    } catch (error) {
      console.error('Erro ao carregar eventos do webhook:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  // ============================================================================
  // CONFIGURAR WEBHOOK
  // ============================================================================

  const setupWebhook = async () => {
    try {
      setConfiguring(true);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/whatsapp/webhook/setup`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            webhookUrl,
            events: selectedEvents,
            webhookByEvents,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success('Webhook configurado com sucesso!');
        await loadWebhookStatus();
      } else {
        toast.error(result.error || 'Erro ao configurar webhook');
      }
    } catch (error) {
      console.error('Erro ao configurar webhook:', error);
      toast.error('Erro ao configurar webhook');
    } finally {
      setConfiguring(false);
    }
  };

  // ============================================================================
  // REMOVER WEBHOOK
  // ============================================================================

  const removeWebhook = async () => {
    if (!confirm('Deseja realmente remover a configuração do webhook?')) {
      return;
    }

    try {
      setConfiguring(true);
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/rendizy-server/make-server-67caf26a/whatsapp/webhook`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success('Webhook removido com sucesso!');
        await loadWebhookStatus();
      } else {
        toast.error(result.error || 'Erro ao remover webhook');
      }
    } catch (error) {
      console.error('Erro ao remover webhook:', error);
      toast.error('Erro ao remover webhook');
    } finally {
      setConfiguring(false);
    }
  };

  // ============================================================================
  // COPIAR URL
  // ============================================================================

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success('URL copiada para a área de transferência!');
  };

  // ============================================================================
  // TOGGLE EVENTO
  // ============================================================================

  const toggleEvent = (eventName: string) => {
    setSelectedEvents(prev => 
      prev.includes(eventName)
        ? prev.filter(e => e !== eventName)
        : [...prev, eventName]
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* STATUS DO WEBHOOK */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Webhook className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <CardTitle>Configuração de Webhook</CardTitle>
                <CardDescription>
                  Configure webhooks para receber eventos em tempo real da Evolution API
                </CardDescription>
              </div>
            </div>
            <Badge variant={webhookStatus?.enabled ? "default" : "secondary"}>
              {webhookStatus?.enabled ? (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Ativo
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 mr-1" />
                  Inativo
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL DO WEBHOOK */}
          <div className="space-y-2">
            <Label>URL do Webhook</Label>
            <div className="flex gap-2">
              <Input 
                value={webhookUrl} 
                readOnly 
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copyWebhookUrl}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Esta é a URL que a Evolution API usará para enviar eventos
            </p>
          </div>

          <Separator />

          {/* OPÇÕES DE WEBHOOK */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Webhook por Evento</Label>
                <p className="text-xs text-muted-foreground">
                  Criar uma rota de webhook diferente para cada tipo de evento
                </p>
              </div>
              <Switch
                checked={webhookByEvents}
                onCheckedChange={setWebhookByEvents}
              />
            </div>
          </div>

          <Separator />

          {/* EVENTOS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Eventos Monitorados</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedEvents(
                  selectedEvents.length === AVAILABLE_EVENTS.length 
                    ? [] 
                    : AVAILABLE_EVENTS.map(e => e.name)
                )}
              >
                {selectedEvents.length === AVAILABLE_EVENTS.length 
                  ? 'Desmarcar Todos' 
                  : 'Marcar Todos'}
              </Button>
            </div>

            <ScrollArea className="h-64 border rounded-lg p-4">
              <div className="space-y-2">
                {AVAILABLE_EVENTS.map((event) => (
                  <div 
                    key={event.name}
                    className="flex items-start gap-3 p-2 hover:bg-accent rounded-lg cursor-pointer"
                    onClick={() => toggleEvent(event.name)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event.name)}
                      onChange={() => toggleEvent(event.name)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span>{event.label}</span>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {event.name}
                        </code>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {event.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <p className="text-xs text-muted-foreground">
              {selectedEvents.length} de {AVAILABLE_EVENTS.length} eventos selecionados
            </p>
          </div>

          <Separator />

          {/* AÇÕES */}
          <div className="flex gap-2">
            <Button
              onClick={setupWebhook}
              disabled={configuring || selectedEvents.length === 0}
              className="flex-1"
            >
              {configuring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Configurando...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  {webhookStatus?.enabled ? 'Atualizar Webhook' : 'Ativar Webhook'}
                </>
              )}
            </Button>

            {webhookStatus?.enabled && (
              <Button
                variant="destructive"
                onClick={removeWebhook}
                disabled={configuring}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remover
              </Button>
            )}
          </div>

          {webhookStatus?.enabled && webhookStatus.url && (
            <Alert>
              <CheckCircle2 className="w-4 h-4" />
              <AlertDescription>
                Webhook ativo e configurado. Eventos serão recebidos automaticamente.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* EVENTOS RECEBIDOS */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle>Eventos Recebidos</CardTitle>
                <CardDescription>
                  Últimos 50 eventos recebidos do webhook
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadWebhookEvents}
              disabled={loadingEvents}
            >
              {loadingEvents ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {webhookEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum evento recebido ainda</p>
              <p className="text-xs mt-1">
                Configure o webhook acima para começar a receber eventos
              </p>
            </div>
          ) : (
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {webhookEvents.map((event, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg space-y-2 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">
                        {event.event}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.receivedAt || event.updatedAt || '').toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Ver dados do evento
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
