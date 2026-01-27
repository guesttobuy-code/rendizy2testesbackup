/**
 * RENDIZY - Notification Template Editor
 * 
 * Modal para criar/editar templates de notificação multi-canal
 * Editor com tabs para cada canal + preview com variáveis
 * 
 * @version 1.0.0
 * @date 2026-01-27
 * @author GitHub Copilot
 * 
 * ============================================================================
 * REFERÊNCIA RÁPIDA
 * ============================================================================
 * 
 * USADO POR: NotificationTemplatesPage.tsx
 * API: utils/api-notification-templates.ts
 * BACKEND: routes-notification-templates.ts
 * 
 * TABS DO EDITOR:
 * 1. Geral - Nome, trigger, status
 * 2. Email - Assunto + corpo HTML
 * 3. SMS - Corpo (limite 480 chars)
 * 4. WhatsApp - Corpo texto
 * 5. In-App - Título + corpo
 * 
 * VARIÁVEIS: Usa sintaxe {{nomeVariavel}}
 * PREVIEW: Substitui variáveis com dados de exemplo (SAMPLE_DATA)
 * TESTE: Envia notificação real para destinatário informado
 * 
 * DOCS:
 * - docs/ARQUITETURA_NOTIFICACOES.md
 * - docs/REFERENCIA_NOTIFICACOES.md
 * 
 * ============================================================================
 */

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import {
  Save,
  Send,
  Eye,
  Mail,
  MessageSquare,
  Smartphone,
  Bell,
  Loader2,
  Info,
  Variable,
  Settings,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import {
  createTemplate,
  updateTemplate,
  testTemplate,
  NotificationTemplate,
  NotificationTemplateInput,
  TriggerType,
  NotificationChannel,
  TRIGGER_CATEGORIES,
  CHANNEL_LABELS,
  SAMPLE_DATA,
  extractVariables,
  replaceVariables,
} from '../utils/api-notification-templates';
import { listNotificationProviders } from '../utils/api-notification-providers';

// ============================================================================
// TIPOS
// ============================================================================

interface NotificationTemplateEditorProps {
  open: boolean;
  template: NotificationTemplate | null;
  triggers: TriggerType[];
  onClose: (saved: boolean) => void;
}

interface ProviderOption {
  value: string;
  label: string;
  configured: boolean;
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

const VariableButton = ({ 
  variable, 
  onClick 
}: { 
  variable: string; 
  onClick: (v: string) => void 
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs font-mono"
          onClick={() => onClick(variable)}
        >
          {`{{${variable}}}`}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Clique para inserir</p>
        <p className="text-xs text-muted-foreground">
          Exemplo: {SAMPLE_DATA[variable] || variable}
        </p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const PreviewPanel = ({ 
  content, 
  subject,
  channel 
}: { 
  content: string;
  subject?: string;
  channel: NotificationChannel;
}) => {
  const renderedSubject = subject ? replaceVariables(subject, SAMPLE_DATA) : undefined;
  const renderedContent = replaceVariables(content, SAMPLE_DATA);
  const missingVars = extractVariables(content).filter(v => !SAMPLE_DATA[v]);

  return (
    <div className="border rounded-lg p-4 bg-muted/30">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Preview</span>
        {missingVars.length > 0 && (
          <Badge variant="outline" className="text-orange-600">
            {missingVars.length} variável(is) sem exemplo
          </Badge>
        )}
      </div>
      
      {channel === 'email' && renderedSubject && (
        <div className="mb-3">
          <Label className="text-xs text-muted-foreground">Assunto</Label>
          <div className="p-2 bg-background rounded border mt-1 text-sm">
            {renderedSubject}
          </div>
        </div>
      )}
      
      <div>
        <Label className="text-xs text-muted-foreground">
          {channel === 'email' ? 'Corpo do Email' : 'Mensagem'}
        </Label>
        <div className="p-3 bg-background rounded border mt-1 text-sm whitespace-pre-wrap min-h-[100px]">
          {renderedContent || <span className="text-muted-foreground italic">Digite o conteúdo...</span>}
        </div>
      </div>
      
      {channel === 'sms' && (
        <div className="mt-2 text-xs text-muted-foreground">
          {renderedContent.length}/160 caracteres 
          ({Math.ceil(renderedContent.length / 160)} SMS)
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function NotificationTemplateEditor({
  open,
  template,
  triggers,
  onClose,
}: NotificationTemplateEditorProps) {
  const isEditing = !!template;

  // Estados do formulário
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [internalCode, setInternalCode] = useState('');
  const [triggerEvent, setTriggerEvent] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [channels, setChannels] = useState<NotificationChannel[]>(['email']);
  
  // Conteúdo por canal
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailProvider, setEmailProvider] = useState('__default__');
  
  const [smsBody, setSmsBody] = useState('');
  const [smsProvider, setSmsProvider] = useState('__default__');
  
  const [whatsappBody, setWhatsappBody] = useState('');
  const [whatsappProvider, setWhatsappProvider] = useState('__default__');
  
  const [inAppTitle, setInAppTitle] = useState('');
  const [inAppBody, setInAppBody] = useState('');
  
  // Estados de UI
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [testChannel, setTestChannel] = useState<NotificationChannel>('email');
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  
  // Providers disponíveis
  const [emailProviders, setEmailProviders] = useState<ProviderOption[]>([]);
  const [smsProviders, setSmsProviders] = useState<ProviderOption[]>([]);
  const [whatsappProviders, setWhatsappProviders] = useState<ProviderOption[]>([]);

  // Carregar providers
  useEffect(() => {
    async function loadProviders() {
      try {
        const { configuredProviders } = await listNotificationProviders();
        
        setEmailProviders([
          { value: '__default__', label: 'Padrão (automático)', configured: true },
          { value: 'resend', label: 'Resend', configured: configuredProviders.email?.includes('resend') },
          { value: 'brevo-email', label: 'Brevo', configured: configuredProviders.email?.includes('brevo-email') },
        ]);
        
        setSmsProviders([
          { value: '__default__', label: 'Padrão (automático)', configured: true },
          { value: 'brevo-sms', label: 'Brevo SMS', configured: configuredProviders.sms?.includes('brevo-sms') },
        ]);
        
        setWhatsappProviders([
          { value: '__default__', label: 'Padrão (automático)', configured: true },
          { value: 'evolution-api', label: 'Evolution API', configured: configuredProviders.whatsapp?.includes('evolution-api') },
        ]);
      } catch (err) {
        console.error('Erro ao carregar providers:', err);
      }
    }
    
    if (open) {
      loadProviders();
    }
  }, [open]);

  // Carregar dados do template ao editar
  useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description || '');
      setInternalCode(template.internal_code || '');
      setTriggerEvent(template.trigger_event);
      setIsActive(template.is_active);
      setChannels(template.channels || ['email']);
      
      setEmailSubject(template.email_subject || '');
      setEmailBody(template.email_body || '');
      setEmailProvider(template.email_provider || '__default__');
      
      setSmsBody(template.sms_body || '');
      setSmsProvider(template.sms_provider || '__default__');
      
      setWhatsappBody(template.whatsapp_body || '');
      setWhatsappProvider(template.whatsapp_provider || '__default__');
      
      setInAppTitle(template.in_app_title || '');
      setInAppBody(template.in_app_body || '');
    } else {
      // Reset para novo template
      setName('');
      setDescription('');
      setInternalCode('');
      setTriggerEvent('');
      setIsActive(true);
      setChannels(['email']);
      setEmailSubject('');
      setEmailBody('');
      setEmailProvider('__default__');
      setSmsBody('');
      setSmsProvider('__default__');
      setWhatsappBody('');
      setWhatsappProvider('__default__');
      setInAppTitle('');
      setInAppBody('');
    }
    setActiveTab('general');
  }, [template, open]);

  // Trigger selecionado
  const selectedTrigger = useMemo(() => 
    triggers.find(t => t.id === triggerEvent),
    [triggers, triggerEvent]
  );

  // Variáveis disponíveis
  const availableVariables = useMemo(() => 
    selectedTrigger?.available_variables || [],
    [selectedTrigger]
  );

  // Agrupar triggers por categoria
  const triggersByCategory = useMemo(() => {
    return triggers.reduce((acc, trigger) => {
      if (!acc[trigger.category]) {
        acc[trigger.category] = [];
      }
      acc[trigger.category].push(trigger);
      return acc;
    }, {} as Record<string, TriggerType[]>);
  }, [triggers]);

  // Toggle canal
  const toggleChannel = (channel: NotificationChannel) => {
    setChannels(prev => 
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  // Inserir variável no campo ativo
  const insertVariable = (variable: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    setter(prev => prev + `{{${variable}}}`);
  };

  // Salvar template
  const handleSave = async () => {
    // Validações
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      setActiveTab('general');
      return;
    }
    
    if (!triggerEvent) {
      toast.error('Selecione um trigger');
      setActiveTab('general');
      return;
    }
    
    if (channels.length === 0) {
      toast.error('Selecione pelo menos um canal');
      setActiveTab('general');
      return;
    }
    
    // Validar conteúdo dos canais selecionados
    if (channels.includes('email') && !emailBody.trim()) {
      toast.error('Corpo do email é obrigatório');
      setActiveTab('email');
      return;
    }
    
    if (channels.includes('sms') && !smsBody.trim()) {
      toast.error('Mensagem SMS é obrigatória');
      setActiveTab('sms');
      return;
    }
    
    if (channels.includes('whatsapp') && !whatsappBody.trim()) {
      toast.error('Mensagem WhatsApp é obrigatória');
      setActiveTab('whatsapp');
      return;
    }

    setIsSaving(true);
    try {
      // Converter __default__ de volta para undefined (null no banco)
      const getProvider = (provider: string) => 
        provider && provider !== '__default__' ? provider : undefined;

      const input: NotificationTemplateInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        internal_code: internalCode.trim() || undefined,
        trigger_event: triggerEvent,
        is_active: isActive,
        channels,
        email_subject: channels.includes('email') ? emailSubject : undefined,
        email_body: channels.includes('email') ? emailBody : undefined,
        email_provider: channels.includes('email') ? getProvider(emailProvider) : undefined,
        sms_body: channels.includes('sms') ? smsBody : undefined,
        sms_provider: channels.includes('sms') ? getProvider(smsProvider) : undefined,
        whatsapp_body: channels.includes('whatsapp') ? whatsappBody : undefined,
        whatsapp_provider: channels.includes('whatsapp') ? getProvider(whatsappProvider) : undefined,
        in_app_title: channels.includes('in_app') ? inAppTitle : undefined,
        in_app_body: channels.includes('in_app') ? inAppBody : undefined,
      };

      if (isEditing && template) {
        await updateTemplate(template.id, input);
        toast.success('Template atualizado com sucesso!');
      } else {
        await createTemplate(input);
        toast.success('Template criado com sucesso!');
      }
      
      onClose(true);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar template');
    } finally {
      setIsSaving(false);
    }
  };

  // Testar envio
  const handleTest = async () => {
    if (!template?.id) {
      toast.error('Salve o template antes de testar');
      return;
    }
    
    if (!testRecipient.trim()) {
      toast.error('Digite o destinatário');
      return;
    }

    setIsTesting(true);
    try {
      const result = await testTemplate(template.id, testChannel, testRecipient.trim());
      if (result.success) {
        toast.success(result.message || 'Teste enviado com sucesso!');
        setTestDialogOpen(false);
      } else {
        toast.error(result.error || 'Falha ao enviar teste');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao testar');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose(false)}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? 'Editar Template' : 'Novo Template'}
            {template?.is_system && (
              <Badge variant="outline">Sistema</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Configure o conteúdo para cada canal de notificação
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="general" className="gap-1">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Geral</span>
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-1" disabled={!channels.includes('email')}>
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Email</span>
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-1" disabled={!channels.includes('sms')}>
              <Smartphone className="w-4 h-4" />
              <span className="hidden sm:inline">SMS</span>
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-1" disabled={!channels.includes('whatsapp')}>
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </TabsTrigger>
            <TabsTrigger value="in_app" className="gap-1" disabled={!channels.includes('in_app')}>
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">In-App</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            {/* Tab: Geral */}
            <TabsContent value="general" className="space-y-4 m-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Template *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Confirmação de Reserva"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="internal_code">Código Interno</Label>
                  <Input
                    id="internal_code"
                    value={internalCode}
                    onChange={(e) => setInternalCode(e.target.value)}
                    placeholder="Ex: reservation_confirmed"
                    className="font-mono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva quando este template é utilizado"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trigger">Trigger (Quando disparar) *</Label>
                <Select value={triggerEvent} onValueChange={setTriggerEvent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o evento que dispara esta notificação" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(triggersByCategory).map(([category, categoryTriggers]) => (
                      <React.Fragment key={category}>
                        <SelectItem value={`__header_${category}`} disabled className="font-semibold">
                          {TRIGGER_CATEGORIES[category]}
                        </SelectItem>
                        {categoryTriggers.map(trigger => (
                          <SelectItem key={trigger.id} value={trigger.id} className="pl-6">
                            <div>
                              <span>{trigger.name}</span>
                              {trigger.description && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  - {trigger.description}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </React.Fragment>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Canais Habilitados *</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(['email', 'sms', 'whatsapp', 'in_app'] as NotificationChannel[]).map(channel => (
                    <div
                      key={channel}
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                        channels.includes(channel) 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleChannel(channel)}
                    >
                      <div className="flex items-center gap-2">
                        {channel === 'email' && <Mail className="w-4 h-4" />}
                        {channel === 'sms' && <Smartphone className="w-4 h-4" />}
                        {channel === 'whatsapp' && <MessageSquare className="w-4 h-4" />}
                        {channel === 'in_app' && <Bell className="w-4 h-4" />}
                        <span>{CHANNEL_LABELS[channel]}</span>
                      </div>
                      <Switch
                        checked={channels.includes(channel)}
                        onCheckedChange={() => toggleChannel(channel)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Templates inativos não são enviados automaticamente
                  </p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </TabsContent>

            {/* Tab: Email */}
            <TabsContent value="email" className="space-y-4 m-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email_provider">Provider</Label>
                    <Select value={emailProvider} onValueChange={setEmailProvider}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {emailProviders.map(p => (
                          <SelectItem 
                            key={p.value || 'default'} 
                            value={p.value}
                            disabled={!p.configured && p.value !== '__default__'}
                          >
                            {p.label}
                            {!p.configured && p.value !== '__default__' && ' (não configurado)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email_subject">Assunto *</Label>
                    <Input
                      id="email_subject"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Ex: Sua reserva foi confirmada! 🎉"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email_body">Corpo do Email *</Label>
                    <Textarea
                      id="email_body"
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="Digite o conteúdo do email..."
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>

                  {availableVariables.length > 0 && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Variable className="w-4 h-4" />
                        Variáveis Disponíveis
                      </Label>
                      <div className="flex flex-wrap gap-1">
                        {availableVariables.map(v => (
                          <VariableButton 
                            key={v} 
                            variable={v} 
                            onClick={() => insertVariable(v, setEmailBody)} 
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <PreviewPanel 
                    content={emailBody} 
                    subject={emailSubject}
                    channel="email" 
                  />
                </div>
              </div>
            </TabsContent>

            {/* Tab: SMS */}
            <TabsContent value="sms" className="space-y-4 m-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sms_provider">Provider</Label>
                    <Select value={smsProvider} onValueChange={setSmsProvider}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {smsProviders.map(p => (
                          <SelectItem 
                            key={p.value || 'default'} 
                            value={p.value}
                            disabled={!p.configured && p.value !== '__default__'}
                          >
                            {p.label}
                            {!p.configured && p.value !== '__default__' && ' (não configurado)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Alert>
                    <Info className="w-4 h-4" />
                    <AlertDescription>
                      SMS tem limite de 160 caracteres por mensagem. Mensagens maiores serão divididas.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="sms_body">Mensagem SMS *</Label>
                    <Textarea
                      id="sms_body"
                      value={smsBody}
                      onChange={(e) => setSmsBody(e.target.value)}
                      placeholder="Digite a mensagem SMS..."
                      rows={6}
                      maxLength={480}
                    />
                    <div className="text-xs text-muted-foreground text-right">
                      {smsBody.length}/160 ({Math.ceil(smsBody.length / 160) || 1} SMS)
                    </div>
                  </div>

                  {availableVariables.length > 0 && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Variable className="w-4 h-4" />
                        Variáveis Disponíveis
                      </Label>
                      <div className="flex flex-wrap gap-1">
                        {availableVariables.map(v => (
                          <VariableButton 
                            key={v} 
                            variable={v} 
                            onClick={() => insertVariable(v, setSmsBody)} 
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <PreviewPanel content={smsBody} channel="sms" />
                </div>
              </div>
            </TabsContent>

            {/* Tab: WhatsApp */}
            <TabsContent value="whatsapp" className="space-y-4 m-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp_provider">Provider</Label>
                    <Select value={whatsappProvider} onValueChange={setWhatsappProvider}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {whatsappProviders.map(p => (
                          <SelectItem 
                            key={p.value || 'default'} 
                            value={p.value}
                            disabled={!p.configured && p.value !== '__default__'}
                          >
                            {p.label}
                            {!p.configured && p.value !== '__default__' && ' (não configurado)'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp_body">Mensagem WhatsApp *</Label>
                    <Textarea
                      id="whatsapp_body"
                      value={whatsappBody}
                      onChange={(e) => setWhatsappBody(e.target.value)}
                      placeholder="Digite a mensagem do WhatsApp..."
                      rows={10}
                    />
                    <p className="text-xs text-muted-foreground">
                      Você pode usar *negrito*, _itálico_ e ~riscado~ na formatação
                    </p>
                  </div>

                  {availableVariables.length > 0 && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Variable className="w-4 h-4" />
                        Variáveis Disponíveis
                      </Label>
                      <div className="flex flex-wrap gap-1">
                        {availableVariables.map(v => (
                          <VariableButton 
                            key={v} 
                            variable={v} 
                            onClick={() => insertVariable(v, setWhatsappBody)} 
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <PreviewPanel content={whatsappBody} channel="whatsapp" />
                </div>
              </div>
            </TabsContent>

            {/* Tab: In-App */}
            <TabsContent value="in_app" className="space-y-4 m-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <Alert>
                    <Bell className="w-4 h-4" />
                    <AlertDescription>
                      Notificações In-App aparecem no painel de notificações do sistema.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="in_app_title">Título *</Label>
                    <Input
                      id="in_app_title"
                      value={inAppTitle}
                      onChange={(e) => setInAppTitle(e.target.value)}
                      placeholder="Ex: Nova reserva confirmada"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="in_app_body">Mensagem *</Label>
                    <Textarea
                      id="in_app_body"
                      value={inAppBody}
                      onChange={(e) => setInAppBody(e.target.value)}
                      placeholder="Digite a mensagem da notificação..."
                      rows={4}
                    />
                  </div>

                  {availableVariables.length > 0 && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        <Variable className="w-4 h-4" />
                        Variáveis Disponíveis
                      </Label>
                      <div className="flex flex-wrap gap-1">
                        {availableVariables.slice(0, 10).map(v => (
                          <VariableButton 
                            key={v} 
                            variable={v} 
                            onClick={() => insertVariable(v, setInAppBody)} 
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <PreviewPanel 
                    content={inAppBody} 
                    subject={inAppTitle}
                    channel="in_app" 
                  />
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="flex-row justify-between sm:justify-between mt-4">
          <div>
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setTestDialogOpen(true)}
                disabled={!template?.id || channels.length === 0}
              >
                <Send className="w-4 h-4 mr-2" />
                Enviar Teste
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onClose(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isEditing ? 'Salvar Alterações' : 'Criar Template'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      {/* Test Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Teste</DialogTitle>
            <DialogDescription>
              Envie uma mensagem de teste para verificar o template
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Canal</Label>
              <Select value={testChannel} onValueChange={(v) => setTestChannel(v as NotificationChannel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {channels.map(channel => (
                    <SelectItem key={channel} value={channel}>
                      {CHANNEL_LABELS[channel]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Destinatário</Label>
              <Input
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder={
                  testChannel === 'email' ? 'email@exemplo.com' :
                  testChannel === 'sms' || testChannel === 'whatsapp' ? '+5511999999999' :
                  'ID do usuário'
                }
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleTest} disabled={isTesting}>
              {isTesting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
