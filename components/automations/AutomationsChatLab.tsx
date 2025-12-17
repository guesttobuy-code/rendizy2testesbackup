import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Loader2, Send, Image as ImageIcon, X, Bot, User, Sparkles, Save, Workflow } from 'lucide-react';
import { toast } from 'sonner';
import { automationsApi, type AutomationNaturalLanguageResponse, type AutomationPriority, type CreateAutomationRequest } from '../../utils/api';
import { ModuleSelector } from './ModuleSelector';
import { PropertySelector } from './PropertySelector';
// import { ScrollArea } from '../ui/scroll-area'; // Comentado temporariamente para evitar quebrar o sistema

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[]; // URLs das imagens
  timestamp: Date;
}

interface AutomationContext {
  modules: string[]; // Múltipla escolha
  properties: string[]; // IDs dos imóveis selecionados
  channel: 'chat' | 'whatsapp' | 'email' | 'sms' | 'dashboard';
  priority: AutomationPriority;
  language: string;
}

const DEFAULT_CONTEXT: AutomationContext = {
  modules: ['financeiro'], // Array por padrão
  properties: [], // Nenhum imóvel selecionado = global
  channel: 'chat',
  priority: 'media',
  language: 'pt-BR',
};

export function AutomationsChatLab() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<AutomationContext>(DEFAULT_CONTEXT);
  const [automationResult, setAutomationResult] = useState<AutomationNaturalLanguageResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [automationName, setAutomationName] = useState('');
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mensagem inicial do assistente
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: 'Olá! Sou o assistente de automações do Rendizy. Descreva o que você gostaria de automatizar e eu vou te ajudar a criar uma automação completa. Você pode enviar imagens também para me ajudar a entender melhor o contexto.',
        timestamp: new Date(),
      }]);
    }
  }, []);

  // Handle paste de imagens
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter(item => item.kind === 'file' && item.type.startsWith('image/'));

    if (imageItems.length > 0) {
      e.preventDefault();
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (file) {
          if (file.size > 10 * 1024 * 1024) {
            toast.error('Imagem muito grande (máximo 10MB)');
            continue;
          }
          setPendingImages(prev => [...prev, file]);
        }
      }
    }
  };

  // Handle drag & drop de imagens
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`Imagem ${file.name} muito grande (máximo 10MB)`);
        return;
      }
      setPendingImages(prev => [...prev, file]);
    });
  };

  // Remover imagem pendente
  const removePendingImage = (index: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index));
  };

  // Converter imagem para base64
  const imageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Enviar mensagem
  const handleSend = async () => {
    console.log('[AutomationsChatLab] handleSend chamado', { input: input.trim(), pendingImages: pendingImages.length });
    
    if (!input.trim() && pendingImages.length === 0) {
      toast.error('Digite uma mensagem ou envie uma imagem');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      images: [],
      timestamp: new Date(),
    };
    
    console.log('[AutomationsChatLab] Mensagem do usuário criada', userMessage);

    // Processar imagens pendentes
    if (pendingImages.length > 0) {
      const imageUrls: string[] = [];
      for (const file of pendingImages) {
        try {
          const base64 = await imageToBase64(file);
          imageUrls.push(base64);
        } catch (error) {
          console.error('Erro ao processar imagem:', error);
          toast.error(`Erro ao processar imagem ${file.name}`);
        }
      }
      userMessage.images = imageUrls;
      setPendingImages([]);
    }

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Construir contexto da conversa (últimas 10 mensagens para não exceder limite)
      const recentMessages = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-10);
      
      const conversationContext = recentMessages
        .map(m => {
          let content = `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`;
          if (m.images && m.images.length > 0) {
            content += ` [${m.images.length} imagem(ns) anexada(s) - descreva o conteúdo das imagens na sua resposta]`;
          }
          return content;
        })
        .join('\n\n');

      let fullInput = conversationContext;
      if (fullInput) {
        fullInput += '\n\n';
      }
      fullInput += `Usuário: ${userMessage.content}`;
      if (userMessage.images && userMessage.images.length > 0) {
        fullInput += `\n[O usuário anexou ${userMessage.images.length} imagem(ns). Por favor, peça ao usuário para descrever o conteúdo das imagens ou mencione que você não pode ver imagens diretamente, mas pode ajudar baseado na descrição fornecida.]`;
      }

      // Chamar API de interpretação em modo conversacional
      const requestPayload = {
        input: userMessage.content,
        modules: context.modules, // Array de módulos
        properties: context.properties.length > 0 ? context.properties : undefined, // Array de imóveis
        channel: context.channel,
        priority: context.priority,
        language: context.language,
        conversationMode: true,
        conversationHistory: messages
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .slice(-10)
          .map(m => ({
            role: m.role,
            content: m.content,
          })),
      };
      
      console.log('[AutomationsChatLab] Chamando API com payload:', requestPayload);
      
      const response = await automationsApi.ai.interpretNaturalLanguage(requestPayload);
      
      console.log('[AutomationsChatLab] Resposta da API:', response);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Erro ao processar mensagem');
      }

      // Verificar se a resposta contém uma automação completa ou é conversacional
      if (response.data.definition && response.data.definition.name && response.data.definition.trigger) {
        // Automação completa gerada
        setAutomationResult(response.data);
        
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `✅ Perfeito! Criei uma automação baseada na nossa conversa:\n\n**${response.data.definition.name}**\n\n${response.data.definition.description || ''}\n\n📋 **Gatilho:** ${response.data.definition.trigger.type}\n⚡ **Ações:** ${response.data.definition.actions.length}\n\nDeseja salvar esta automação ou quer ajustar algo? Se quiser ajustar, me diga o que mudar.`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Resposta conversacional - IA fazendo perguntas ou esclarecendo
        const assistantContent = response.data.conversationalResponse || 
                                 response.data.rawText?.substring(0, 1000) || 
                                 'Entendi! Continue descrevendo o que você precisa automatizar.';
        
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: assistantContent,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      console.error('[AutomationsChatLab] Erro ao enviar mensagem', error);
      toast.error(error?.message || 'Erro ao processar mensagem');
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Pode tentar novamente?',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Salvar automação
  const handleSaveAutomation = async () => {
    if (!automationResult || !automationName.trim()) {
      toast.error('Digite um nome para a automação');
      return;
    }

    setIsSaving(true);
    try {
      const payload: CreateAutomationRequest = {
        name: automationName.trim(),
        description: automationResult.definition.description,
        definition: automationResult.definition,
        status: 'draft',
        modules: context.modules, // Array de módulos
        properties: context.properties.length > 0 ? context.properties : undefined, // Array de imóveis
        ai_interpretation_summary: automationResult.ai_interpretation_summary, // Resumo da interpretação
        impact_description: automationResult.impact_description, // Descrição do impacto
        channel: context.channel,
        priority: context.priority,
      };

      const response = await automationsApi.create(payload);

      if (!response.success) {
        throw new Error(response.error || 'Erro ao salvar automação');
      }

      toast.success('Automação salva com sucesso!');
      setShowSaveModal(false);
      setAutomationName('');
      setAutomationResult(null);
      
      // Resetar conversa
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: 'Automação salva! Posso ajudar você a criar outra automação?',
        timestamp: new Date(),
      }]);
    } catch (error: any) {
      console.error('[AutomationsChatLab] Erro ao salvar', error);
      toast.error(error?.message || 'Erro ao salvar automação');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          Laboratório de Automações Inteligentes
        </h1>
        <p className="text-muted-foreground text-sm">
          Converse com a IA para criar automações. Você pode enviar imagens para ajudar no contexto.
        </p>
      </div>

      <div className="grid gap-6 items-start lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Configurações */}
        <Card className="lg:sticky lg:top-24 h-full">
          <CardHeader>
            <CardTitle className="text-sm">Configurações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Seleção de Módulos */}
            <div className="space-y-2">
              <ModuleSelector
                selectedModules={context.modules}
                onChange={(modules) => setContext(prev => ({ ...prev, modules }))}
              />
            </div>

            {/* Seleção de Imóveis */}
            <div className="space-y-2">
              <PropertySelector
                selectedProperties={context.properties}
                onChange={(properties) => setContext(prev => ({ ...prev, properties }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Canal</label>
              <Select value={context.channel} onValueChange={(v) => setContext(prev => ({ ...prev, channel: v as any }))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chat">Chat</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="dashboard">Dashboard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Prioridade</label>
              <Select value={context.priority} onValueChange={(v) => setContext(prev => ({ ...prev, priority: v as AutomationPriority }))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Chat */}
        <Card className="flex flex-col min-h-[640px] lg:col-start-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-500" />
              Conversa com IA
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            <div className="flex-1 min-h-[400px] p-4 overflow-y-auto">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-muted'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.images && message.images.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.images.map((img, idx) => (
                            <img key={idx} src={img} alt={`Anexo ${idx + 1}`} className="max-w-full rounded" />
                          ))}
                        </div>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="h-8 w-8 rounded-full bg-gray-500 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-muted rounded-lg p-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Imagens pendentes */}
            {pendingImages.length > 0 && (
              <div className="px-4 py-2 border-t flex gap-2 flex-wrap">
                {pendingImages.map((file, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="h-16 w-16 object-cover rounded"
                    />
                    <button
                      onClick={() => removePendingImage(idx)}
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setPendingImages(prev => [...prev, ...files]);
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Descreva o que você quer automatizar..."
                  className="flex-1 min-h-[60px] max-h-[120px] resize-none rounded-md border p-2 text-sm"
                />
                <Button onClick={handleSend} disabled={isLoading || (!input.trim() && pendingImages.length === 0)}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Pressione Enter para enviar, Shift+Enter para nova linha. Cole imagens diretamente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resultado da Automação */}
      {automationResult && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-green-500" />
              Automação Gerada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-lg font-semibold">{automationResult.definition.name}</p>
              {automationResult.definition.description && (
                <p className="text-sm text-muted-foreground">{automationResult.definition.description}</p>
              )}
            </div>

            {/* Resumo da Interpretação da IA */}
            {automationResult.ai_interpretation_summary && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-1">
                  📋 O que a IA interpretou:
                </p>
                <p className="text-sm">{automationResult.ai_interpretation_summary}</p>
              </div>
            )}

            {/* Descrição do Impacto */}
            {automationResult.impact_description && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                  ⚡ Impacto desta automação:
                </p>
                <p className="text-sm">{automationResult.impact_description}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => setShowSaveModal(true)}>
                <Save className="h-4 w-4 mr-2" />
                Salvar Automação
              </Button>
              <Button variant="outline" onClick={() => setAutomationResult(null)}>
                Descartar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Salvar */}
      {showSaveModal && automationResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Salvar Automação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label>Nome da Automação</label>
                <Input
                  value={automationName}
                  onChange={(e) => setAutomationName(e.target.value)}
                  placeholder="Ex: Alerta Faturamento Diário"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowSaveModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveAutomation} disabled={isSaving || !automationName.trim()}>
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Salvar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

