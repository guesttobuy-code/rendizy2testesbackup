import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Loader2, Wand2, Sparkles, Copy, CheckCircle2, Bot, Workflow, Save } from 'lucide-react';
import { toast } from 'sonner';
import { automationsApi, type AutomationNaturalLanguageResponse, type AutomationPriority, type CreateAutomationRequest } from '../../utils/api';

interface NaturalLanguageForm {
  input: string;
  module: string;
  channel: 'chat' | 'whatsapp' | 'email' | 'sms' | 'dashboard';
  priority: AutomationPriority;
  language: string;
}

const DEFAULT_FORM: NaturalLanguageForm = {
  input: '',
  module: 'financeiro',
  channel: 'chat',
  priority: 'media',
  language: 'pt-BR',
} as NaturalLanguageForm;

export function AutomationsNaturalLanguageLab() {
  const [form, setForm] = useState<NaturalLanguageForm>(DEFAULT_FORM);
  const [result, setResult] = useState<AutomationNaturalLanguageResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [automationName, setAutomationName] = useState('');

  const handleSubmit = async () => {
    if (!form.input.trim()) {
      toast.error('Descreva a automação em linguagem natural');
      return;
    }

    setIsSubmitting(true);
    setCopied(false);
    try {
      const response = await automationsApi.ai.interpretNaturalLanguage({
        input: form.input,
        module: form.module,
        channel: form.channel,
        priority: form.priority,
        language: form.language,
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Falha ao interpretar automação');
      }

      setResult(response.data);
      toast.success('Automação gerada com sucesso!');
    } catch (error: any) {
      console.error('[AutomationsLab] Erro ao gerar automação', error);
      toast.error(error?.message || 'Erro ao gerar automação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyResult = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result.definition, null, 2));
    setCopied(true);
    toast.success('JSON copiado para a área de transferência');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          Laboratório de Automações Inteligentes
        </h1>
        <p className="text-muted-foreground text-sm">
          Descreva em linguagem natural o que deseja automatizar. O copiloto IA converte para um fluxo estruturado com
          gatilho, condições e ações.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-500" />
            Descrever automação
          </CardTitle>
          <CardDescription>Use linguagem natural. Exemplo: "Quando vendas do dashboard passarem de 50k me avise".</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Descrição (linguagem natural)</Label>
            <Textarea
              rows={4}
              placeholder="Ex.: Todo dia às 18h resuma as vendas do dia e envie no chat financeiro"
              value={form.input}
              onChange={(event) => setForm((prev) => ({ ...prev, input: event.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Módulo alvo</Label>
              <Select
                value={form.module}
                onValueChange={(value) => setForm((prev) => ({ ...prev, module: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="crm">CRM & Vendas</SelectItem>
                  <SelectItem value="reservas">Reservas</SelectItem>
                  <SelectItem value="operacoes">Operações & Limpeza</SelectItem>
                  <SelectItem value="chat">Comunicação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Canal</Label>
              <Select
                value={form.channel}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, channel: value as NaturalLanguageForm['channel'] }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chat">Chat interno</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={form.priority}
                onValueChange={(value) => setForm((prev) => ({ ...prev, priority: value as AutomationPriority }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 max-w-sm">
            <Label>Idioma</Label>
            <Input
              value={form.language}
              onChange={(event) => setForm((prev) => ({ ...prev, language: event.target.value }))}
              placeholder="pt-BR"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Gerando...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Gerar automação
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setForm(DEFAULT_FORM);
                setResult(null);
                setCopied(false);
              }}
            >
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-green-500" />
              Automação sugerida
            </CardTitle>
            <CardDescription>
              Provider: {result.provider} • Modelo: {result.model}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{result.definition.trigger.type}</Badge>
              {result.definition.metadata?.priority && (
                <Badge variant="outline" className="capitalize">
                  Prioridade: {result.definition.metadata.priority}
                </Badge>
              )}
              {result.definition.metadata?.requiresApproval && (
                <Badge variant="destructive">Requer aprovação</Badge>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-lg font-semibold">{result.definition.name}</p>
              {result.definition.description && (
                <p className="text-sm text-muted-foreground">{result.definition.description}</p>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-semibold">Gatilho</p>
              <div className="rounded-md border p-3 bg-background">
                <pre className="text-xs whitespace-pre-wrap">
{JSON.stringify(result.definition.trigger, null, 2)}
                </pre>
              </div>

              {result.definition.conditions?.length ? (
                <>
                  <p className="font-semibold">Condições</p>
                  <div className="rounded-md border p-3 bg-background">
                    <pre className="text-xs whitespace-pre-wrap">
{JSON.stringify(result.definition.conditions, null, 2)}
                    </pre>
                  </div>
                </>
              ) : null}

              <p className="font-semibold">Ações ({result.definition.actions.length})</p>
              <div className="rounded-md border p-3 bg-background">
                <pre className="text-xs whitespace-pre-wrap">
{JSON.stringify(result.definition.actions, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={copyResult}>
                {copied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copiar JSON
                  </>
                )}
              </Button>
              <Button 
                size="sm" 
                onClick={() => {
                  setAutomationName(result.definition.name || '');
                  setShowSaveModal(true);
                }}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-1" />
                    Salvar Automação
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!result && (
        <Alert variant="default">
          <AlertTitle>Sem automação gerada ainda</AlertTitle>
          <AlertDescription>
            Escreva um pedido detalhado para ver como a IA traduz em gatilhos e ações. Exemplos:
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              <li>"Se o faturamento diário passar de 30 mil, mande alerta no chat financeiro"</li>
              <li>"Após o checkout, peça review 24h depois via WhatsApp"</li>
              <li>"Todo dia às 18h envie resumo das reservas e pendências"</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Modal de Salvar Automação */}
      {showSaveModal && result && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Salvar Automação</CardTitle>
              <CardDescription>Dê um nome para sua automação</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Automação</Label>
                <Input
                  value={automationName}
                  onChange={(e) => setAutomationName(e.target.value)}
                  placeholder="Ex: Alerta Faturamento Diário"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowSaveModal(false);
                    setAutomationName('');
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={async () => {
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
                        status: 'draft',
                        module: form.module,
                        channel: form.channel,
                        priority: form.priority,
                      };

                      const response = await automationsApi.create(payload);

                      if (!response.success) {
                        throw new Error(response.error || 'Erro ao salvar automação');
                      }

                      toast.success('Automação salva com sucesso!');
                      setShowSaveModal(false);
                      setAutomationName('');
                    } catch (error: any) {
                      console.error('[AutomationsLab] Erro ao salvar automação', error);
                      toast.error(error?.message || 'Erro ao salvar automação');
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  disabled={isSaving || !automationName.trim()}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default AutomationsNaturalLanguageLab;

