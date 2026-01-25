/**
 * RENDIZY - AutomationCreatorModal
 * 
 * Componente UNIVERSAL para criação de automações via linguagem natural.
 * Pode ser invocado de QUALQUER tela do sistema.
 * 
 * @example
 * // No Chat:
 * <AutomationCreatorModal
 *   open={showModal}
 *   onClose={() => setShowModal(false)}
 *   context={{ module: 'chat', contactId: contact.id }}
 *   onSave={(automation) => console.log('Criada:', automation)}
 * />
 */

import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Loader2, 
  Wand2, 
  Sparkles, 
  Copy, 
  CheckCircle2, 
  Bot, 
  Workflow, 
  Save,
  MessageSquare,
  Bell,
  Mail,
  Calendar,
  Zap,
  Settings2,
  Lightbulb,
  ArrowRight,
  Cpu
} from 'lucide-react';
import { toast } from 'sonner';
import { automationsApi, type AutomationNaturalLanguageResponse, type AutomationPriority, type CreateAutomationRequest, type Automation } from '../../utils/api';
import { cn } from '../ui/utils';
import { interpretLocalAutomation, USE_LOCAL_INTERPRETER } from './localAutomationInterpreter';

// ============================================================================
// TIPOS
// ============================================================================

export interface AutomationContext {
  /** Módulo de origem (chat, reservas, crm, financeiro, etc.) */
  module?: string;
  /** ID do contato (se aplicável) */
  contactId?: string;
  /** ID da propriedade (se aplicável) */
  propertyId?: string;
  /** ID da reserva (se aplicável) */
  reservationId?: string;
  /** Dados extras para pré-preencher */
  prefill?: {
    input?: string;
    channel?: 'chat' | 'whatsapp' | 'email' | 'sms' | 'dashboard';
    priority?: AutomationPriority;
  };
}

export interface AutomationCreatorModalProps {
  /** Controla se o modal está aberto */
  open: boolean;
  /** Callback ao fechar o modal */
  onClose: () => void;
  /** Contexto de onde o modal foi aberto */
  context?: AutomationContext;
  /** Callback após salvar automação com sucesso */
  onSave?: (automation: Automation) => void;
  /** Título customizado do modal */
  title?: string;
  /** Descrição customizada */
  description?: string;
}

interface FormState {
  input: string;
  module: string;
  channel: 'chat' | 'whatsapp' | 'email' | 'sms' | 'dashboard';
  priority: AutomationPriority;
  language: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const MODULES = [
  { value: 'chat', label: 'Chat & Comunicação', icon: MessageSquare },
  { value: 'reservas', label: 'Reservas', icon: Calendar },
  { value: 'crm', label: 'CRM & Vendas', icon: Zap },
  { value: 'financeiro', label: 'Financeiro', icon: Zap },
  { value: 'operacoes', label: 'Operações', icon: Settings2 },
] as const;

const CHANNELS = [
  { value: 'dashboard', label: 'Notificação no Sistema', icon: Bell },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { value: 'email', label: 'E-mail', icon: Mail },
  { value: 'chat', label: 'Chat interno', icon: MessageSquare },
] as const;

const QUICK_TEMPLATES = [
  {
    title: 'Mensagem recebida → Notificar',
    description: 'Quando receber mensagem de um contato específico, me notifica',
    input: 'Quando receber uma mensagem no chat, me notifique imediatamente no sistema',
    module: 'chat',
    channel: 'dashboard',
  },
  {
    title: 'Nova reserva → WhatsApp',
    description: 'Enviar boas-vindas automático após confirmação',
    input: 'Quando uma nova reserva for confirmada, envie mensagem de boas-vindas no WhatsApp',
    module: 'reservas',
    channel: 'whatsapp',
  },
  {
    title: 'Check-in próximo → Lembrete',
    description: '1 dia antes do check-in, enviar instruções',
    input: 'Um dia antes do check-in, envie as instruções de acesso ao hóspede',
    module: 'reservas',
    channel: 'whatsapp',
  },
  {
    title: 'Pagamento atrasado → Alerta',
    description: 'Notificar quando pagamento estiver atrasado',
    input: 'Quando um pagamento estiver atrasado por mais de 2 dias, me notifique',
    module: 'financeiro',
    channel: 'dashboard',
  },
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function AutomationCreatorModal({
  open,
  onClose,
  context,
  onSave,
  title = 'Criar Automação',
  description = 'Descreva em linguagem natural o que você quer automatizar',
}: AutomationCreatorModalProps) {
  // Estados do formulário
  const [form, setForm] = useState<FormState>({
    input: context?.prefill?.input || '',
    module: context?.module || 'chat',
    channel: context?.prefill?.channel || 'dashboard',
    priority: context?.prefill?.priority || 'media',
    language: 'pt-BR',
  });

  // Estados de UI
  const [activeTab, setActiveTab] = useState<'create' | 'result'>('create');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<AutomationNaturalLanguageResponse | null>(null);
  const [automationName, setAutomationName] = useState('');
  const [copied, setCopied] = useState(false);

  // Reset ao abrir/fechar
  useEffect(() => {
    if (open) {
      setForm({
        input: context?.prefill?.input || '',
        module: context?.module || 'chat',
        channel: context?.prefill?.channel || 'dashboard',
        priority: context?.prefill?.priority || 'media',
        language: 'pt-BR',
      });
      setResult(null);
      setAutomationName('');
      setActiveTab('create');
    }
  }, [open, context]);

  // Gerar automação via IA ou interpretador local
  const handleGenerate = useCallback(async () => {
    if (!form.input.trim()) {
      toast.error('Descreva o que você quer automatizar');
      return;
    }

    if (form.input.trim().length < 10) {
      toast.error('Descreva com mais detalhes (mínimo 10 caracteres)');
      return;
    }

    setIsGenerating(true);
    try {
      let response: { success: boolean; data?: AutomationNaturalLanguageResponse; error?: string };

      // Usar interpretador local ou API de IA
      if (USE_LOCAL_INTERPRETER) {
        // 🔧 MODO LOCAL: Interpreta padrões sem API externa
        const localResult = interpretLocalAutomation(form.input, {
          module: form.module,
          channel: form.channel,
          priority: form.priority,
        });
        response = { success: true, data: localResult };
        console.log('[AutomationCreator] ✅ Usando interpretador LOCAL');
      } else {
        // 🤖 MODO IA: Chama API externa (OpenAI, Anthropic, etc)
        response = await automationsApi.ai.interpretNaturalLanguage({
          input: form.input,
          module: form.module,
          channel: form.channel,
          priority: form.priority,
          language: form.language,
        });
        console.log('[AutomationCreator] ✅ Usando API de IA externa');
      }

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Falha ao interpretar automação');
      }

      // Verificar se retornou uma definição válida
      if (!response.data.definition) {
        // Se não retornou definição, pode ser resposta conversacional
        if (response.data.conversationalResponse) {
          toast.info(response.data.conversationalResponse, { duration: 8000 });
          return;
        }
        throw new Error('Não foi possível gerar uma automação para essa descrição');
      }

      setResult(response.data);
      setAutomationName(response.data.definition.name || '');
      setActiveTab('result');
      toast.success(USE_LOCAL_INTERPRETER 
        ? '✨ Automação interpretada! Revise e salve.' 
        : '🤖 Automação gerada pela IA! Revise e salve.'
      );
    } catch (error: any) {
      console.error('[AutomationCreator] Erro ao gerar:', error);
      toast.error(error?.message || 'Erro ao gerar automação');
    } finally {
      setIsGenerating(false);
    }
  }, [form]);

  // Salvar automação
  const handleSave = useCallback(async () => {
    if (!result || !result.definition) return;

    if (!automationName.trim()) {
      toast.error('Digite um nome para a automação');
      return;
    }

    setIsSaving(true);
    try {
      const payload: CreateAutomationRequest = {
        name: automationName.trim(),
        description: result.definition.description,
        definition: result.definition,
        status: 'active',
        module: form.module,
        channel: form.channel,
        priority: form.priority,
      };

      const response = await automationsApi.create(payload);

      if (!response.success || !response.data) {
        // Fallback: tentar salvar localmente se a API falhar
        console.warn('[AutomationCreator] API falhou, tentando salvar localmente...');
        const localAutomation = {
          id: `local-${Date.now()}`,
          ...payload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          trigger_count: 0,
          organization_id: 'local',
        };
        
        // Salvar no localStorage
        const existingAutomations = JSON.parse(localStorage.getItem('rendizy-local-automations') || '[]');
        existingAutomations.push(localAutomation);
        localStorage.setItem('rendizy-local-automations', JSON.stringify(existingAutomations));
        
        toast.success('✨ Automação salva localmente! (API temporariamente indisponível)', { duration: 5000 });
        onSave?.(localAutomation as Automation);
        onClose();
        return;
      }

      toast.success('🎉 Automação criada e ativada!');
      onSave?.(response.data);
      onClose();
    } catch (error: any) {
      console.error('[AutomationCreator] Erro ao salvar:', error);
      toast.error(error?.message || 'Erro ao salvar automação');
    } finally {
      setIsSaving(false);
    }
  }, [result, automationName, form, onSave, onClose]);

  // Aplicar template rápido
  const applyTemplate = useCallback((template: typeof QUICK_TEMPLATES[0]) => {
    setForm(prev => ({
      ...prev,
      input: template.input,
      module: template.module,
      channel: template.channel as FormState['channel'],
    }));
  }, []);

  // Copiar JSON
  const copyJson = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result.definition, null, 2));
    setCopied(true);
    toast.success('JSON copiado!');
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'create' | 'result')} className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Criar
            </TabsTrigger>
            <TabsTrigger value="result" disabled={!result} className="flex items-center gap-2">
              <Workflow className="h-4 w-4" />
              Resultado
              {result && <Badge variant="secondary" className="ml-1 text-xs">1</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* TAB: CRIAR */}
          <TabsContent value="create" className="mt-4 space-y-4">
            <ScrollArea className="h-[400px] pr-4">
              {/* Templates Rápidos */}
              <div className="space-y-2 mb-4">
                <Label className="flex items-center gap-2 text-muted-foreground">
                  <Lightbulb className="h-4 w-4" />
                  Templates rápidos
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_TEMPLATES.map((template, idx) => (
                    <button
                      key={idx}
                      onClick={() => applyTemplate(template)}
                      className={cn(
                        "text-left p-3 rounded-lg border transition-all",
                        "hover:border-purple-500/50 hover:bg-purple-500/5",
                        form.input === template.input && "border-purple-500 bg-purple-500/10"
                      )}
                    >
                      <p className="font-medium text-sm">{template.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Input de linguagem natural */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-blue-500" />
                  Descreva sua automação
                </Label>
                <Textarea
                  rows={4}
                  placeholder="Ex.: Quando receber uma mensagem no WhatsApp, me notifique no sistema e crie uma tarefa de follow-up..."
                  value={form.input}
                  onChange={(e) => setForm(prev => ({ ...prev, input: e.target.value }))}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Seja específico: mencione gatilhos (quando), condições (se) e ações (então).
                </p>
              </div>

              {/* Configurações */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>Módulo</Label>
                  <Select value={form.module} onValueChange={(v) => setForm(prev => ({ ...prev, module: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODULES.map(m => (
                        <SelectItem key={m.value} value={m.value}>
                          <span className="flex items-center gap-2">
                            <m.icon className="h-4 w-4" />
                            {m.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Canal de ação</Label>
                  <Select value={form.channel} onValueChange={(v) => setForm(prev => ({ ...prev, channel: v as FormState['channel'] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map(c => (
                        <SelectItem key={c.value} value={c.value}>
                          <span className="flex items-center gap-2">
                            <c.icon className="h-4 w-4" />
                            {c.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm(prev => ({ ...prev, priority: v as AutomationPriority }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">🟢 Baixa</SelectItem>
                      <SelectItem value="media">🟡 Média</SelectItem>
                      <SelectItem value="alta">🔴 Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ScrollArea>

            {/* Botão Gerar */}
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !form.input.trim()}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  IA processando...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Gerar Automação
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </TabsContent>

          {/* TAB: RESULTADO */}
          <TabsContent value="result" className="mt-4 space-y-4">
            {result && result.definition && (
              <ScrollArea className="h-[400px] pr-4">
                {/* Resumo da IA */}
                {result.ai_interpretation_summary && (
                  <Alert className="mb-4 border-purple-500/30 bg-purple-500/5">
                    <Bot className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Interpretação:</strong> {result.ai_interpretation_summary}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Nome da automação */}
                <div className="space-y-2 mb-4">
                  <Label>Nome da Automação</Label>
                  <Input
                    value={automationName}
                    onChange={(e) => setAutomationName(e.target.value)}
                    placeholder="Ex: Notificar mensagens importantes"
                  />
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap mb-4">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {result.definition.trigger.type}
                  </Badge>
                  {result.definition.metadata?.priority && (
                    <Badge variant="secondary" className="capitalize">
                      {result.definition.metadata.priority}
                    </Badge>
                  )}
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs flex items-center gap-1",
                      result.provider === 'local' && "border-amber-500/50 text-amber-600 bg-amber-500/5"
                    )}
                  >
                    {result.provider === 'local' ? <Cpu className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                    {result.provider === 'local' ? 'Modo Local' : `${result.provider} / ${result.model}`}
                  </Badge>
                </div>

                {/* Visualização do fluxo */}
                <div className="space-y-3">
                  {/* Gatilho */}
                  <div className="rounded-lg border p-3 bg-blue-500/5 border-blue-500/30">
                    <p className="text-xs font-semibold text-blue-600 mb-1">QUANDO (Gatilho)</p>
                    <pre className="text-xs whitespace-pre-wrap text-muted-foreground">
                      {JSON.stringify(result.definition.trigger, null, 2)}
                    </pre>
                  </div>

                  {/* Condições */}
                  {result.definition.conditions && result.definition.conditions.length > 0 && (
                    <div className="rounded-lg border p-3 bg-yellow-500/5 border-yellow-500/30">
                      <p className="text-xs font-semibold text-yellow-600 mb-1">SE (Condições)</p>
                      <pre className="text-xs whitespace-pre-wrap text-muted-foreground">
                        {JSON.stringify(result.definition.conditions, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="rounded-lg border p-3 bg-green-500/5 border-green-500/30">
                    <p className="text-xs font-semibold text-green-600 mb-1">
                      ENTÃO (Ações) — {result.definition.actions.length} ação(ões)
                    </p>
                    <pre className="text-xs whitespace-pre-wrap text-muted-foreground">
                      {JSON.stringify(result.definition.actions, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Botão copiar JSON */}
                <Button variant="ghost" size="sm" onClick={copyJson} className="mt-3">
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar JSON
                    </>
                  )}
                </Button>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        {/* Footer com ações */}
        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          {activeTab === 'result' && result && result.definition && (
            <Button onClick={handleSave} disabled={isSaving || !automationName.trim()}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar e Ativar
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AutomationCreatorModal;
