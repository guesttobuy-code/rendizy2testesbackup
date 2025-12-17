import type { Context } from 'npm:hono';
import { getOrganizationIdForRequest } from './utils-multi-tenant.ts';
import { validationErrorResponse, successResponse, errorResponse, logInfo, logError } from './utils.ts';
import { generateAIChat, type AIChatMessage } from './services/ai-service.ts';

interface NaturalLanguageAutomationRequest {
  input: string;
  module?: string; // Mantido para compatibilidade
  modules?: string[]; // NOVO: Array de módulos
  properties?: string[]; // NOVO: Array de IDs de imóveis
  channel?: 'whatsapp' | 'email' | 'sms' | 'dashboard';
  priority?: 'baixa' | 'media' | 'alta';
  language?: string;
  conversationMode?: boolean; // Novo: modo conversacional
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>; // Histórico da conversa
}

interface AutomationAction {
  type: string;
  channel?: string;
  template?: string;
  payload?: Record<string, unknown>;
}

interface AutomationDefinition {
  name: string;
  description?: string;
  trigger: {
    type: string;
    field?: string;
    operator?: string;
    value?: unknown;
    schedule?: string;
    threshold?: number;
  };
  conditions?: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
  actions: AutomationAction[];
  metadata?: {
    priority?: 'baixa' | 'media' | 'alta';
    requiresApproval?: boolean;
    notifyChannels?: string[];
  };
}

const AUTOMATION_SCHEMA_PROMPT = `
Você é o copiloto responsável por converter comandos em linguagem natural em automações configuráveis dentro do sistema Rendizy.

Você está em uma conversa com o usuário. Seu objetivo é entender completamente o que ele quer automatizar antes de gerar a automação.

REGRAS IMPORTANTES:
1. Se você precisa de mais informações ou algo não está claro, responda de forma CONVERSACIONAL (texto livre, sem JSON) fazendo perguntas específicas.
2. Quando tiver TODAS as informações necessárias, SEMPRE retorne APENAS um JSON válido (sem texto adicional, sem markdown, sem explicações antes ou depois) seguindo este schema:
{
  "definition": {
    "name": string,
    "description": string,
    "trigger": {
      "type": string,
      "field": string | null,
      "operator": string | null,
      "value": any,
      "schedule": string | null,
      "threshold": number | null
    },
    "conditions": [
      {
        "field": string,
        "operator": string,
        "value": any
      }
    ],
    "actions": [
      {
        "type": string,
        "channel": string | null,
        "template": string | null,
        "payload": Record<string, any>
      }
    ],
    "metadata": {
      "priority": "baixa" | "media" | "alta",
      "requiresApproval": boolean,
      "notifyChannels": string[]
    }
  },
  "ai_interpretation_summary": string, // Resumo claro do que você interpretou da solicitação do usuário
  "impact_description": string // Descrição do impacto: o que esta automação faz e como afeta o sistema
}
3. Use sempre ` + '`snake_case`' + ` para campos e valores chave.
4. Se faltar informação crítica, NÃO gere JSON. Faça perguntas conversacionais.
5. Se faltar informação não-crítica, faça suposições razoáveis e indique em metadata.requiresApproval = true.
6. Use o campo metadata.notifyChannels para avisar canais (ex.: ["chat", "email"]).
7. IMPORTANTE: O campo "ai_interpretation_summary" deve ser um resumo claro e objetivo do que você entendeu que o usuário quer automatizar.
8. IMPORTANTE: O campo "impact_description" deve explicar o que esta automação faz, quando é acionada e qual o impacto no sistema.
9. IMPORTANTE: Se você retornar JSON, retorne APENAS o JSON puro, sem markdown (sem blocos de código), sem texto antes ou depois, sem explicações. Apenas o JSON válido.
10. IMPORTANTE: Se você retornar resposta conversacional, NÃO inclua JSON, apenas texto livre.
11. CRÍTICO: O JSON deve começar com { e terminar com }. Não use blocos de código markdown. Não adicione explicações antes ou depois do JSON.
`;

export async function interpretAutomationNaturalLanguage(c: Context) {
  try {
    logInfo('[AutomationsAI] Iniciando interpretação de automação');
    
    let body: NaturalLanguageAutomationRequest;
    try {
      body = await c.req.json<NaturalLanguageAutomationRequest>();
      logInfo('[AutomationsAI] Body parseado com sucesso', { 
        inputLength: body?.input?.length,
        hasModule: !!body?.module,
        conversationMode: body?.conversationMode 
      });
    } catch (parseError: any) {
      logError('[AutomationsAI] Erro ao parsear JSON do body', parseError);
      return c.json(validationErrorResponse('Formato de requisição inválido. Verifique o JSON enviado.'), 400);
    }

    if (!body?.input || body.input.trim().length < 10) {
      logError('[AutomationsAI] Input muito curto', { inputLength: body?.input?.length });
      return c.json(validationErrorResponse('Descreva melhor a automação. Utilize pelo menos 10 caracteres.'), 400);
    }

    logInfo('[AutomationsAI] Obtendo organizationId');
    const organizationId = await getOrganizationIdForRequest(c);
    if (!organizationId) {
      logError('[AutomationsAI] OrganizationId não encontrado');
      return c.json(errorResponse('Organização não identificada'), 401);
    }
    logInfo('[AutomationsAI] OrganizationId obtido', { organizationId });

    logInfo(`[AutomationsAI] Interpretando automação para org ${organizationId}`, { 
      conversationMode: body.conversationMode,
      hasHistory: !!body.conversationHistory?.length,
      inputLength: body.input.length
    });

    // Construir mensagens com histórico se disponível
    const messages: AIChatMessage[] = [
      {
        role: 'system',
        content: AUTOMATION_SCHEMA_PROMPT + (body.conversationMode ? '\n\nVocê está em uma conversa. Pode fazer perguntas antes de gerar a automação final. Seja conversacional e amigável.' : ''),
      },
    ];

    // Adicionar histórico da conversa se disponível
    if (body.conversationHistory && body.conversationHistory.length > 0) {
      // Adicionar apenas últimas 10 mensagens para não exceder limite
      const recentHistory = body.conversationHistory.slice(-10);
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

        // Construir contexto de módulos
        const modulesContext = body.modules && body.modules.length > 0
          ? `Módulos relacionados: ${body.modules.join(', ')}`
          : body.module
          ? `Módulo: ${body.module}`
          : 'Módulo: financeiro (padrão)';

        // Construir contexto de imóveis
        const propertiesContext = body.properties && body.properties.length > 0
          ? `Esta automação se aplica a ${body.properties.length} imóvel(is) específico(s).`
          : 'Esta automação é GLOBAL (aplica-se a todos os imóveis).';

        // Adicionar mensagem atual
        messages.push({
          role: 'user',
          content: `
Contexto:
- ${modulesContext}
- ${propertiesContext}
- Canal desejado: ${body.channel || 'chat'}
- Prioridade: ${body.priority || 'media'}
- Idioma esperado: ${body.language || 'pt-BR'}

Pedido do usuário:
"""
${body.input.trim()}
"""

IMPORTANTE: Além do JSON da automação, você deve retornar também:
1. Um resumo claro do que você interpretou da solicitação do usuário (campo "ai_interpretation_summary")
2. Uma descrição do impacto desta automação - o que ela faz e como afeta o sistema (campo "impact_description")

Retorne um JSON com esta estrutura:
{
  "definition": { ... automação completa ... },
  "ai_interpretation_summary": "Resumo do que foi interpretado",
  "impact_description": "Descrição do impacto e do que esta automação faz"
}
          `.trim(),
        });

    // Ajustar temperatura e tokens baseado no modo
    const temperature = body.conversationMode ? 0.3 : 0.1; // Mais criativo em modo conversacional
    const maxTokens = body.conversationMode ? 2000 : 2000; // ✅ Aumentado para 2000 tokens para garantir JSON completo

    logInfo('[AutomationsAI] Chamando generateAIChat', {
      organizationId,
      messagesCount: messages.length,
      temperature,
      maxTokens,
    });

    let result;
    try {
      result = await generateAIChat({
        organizationId,
        messages,
        temperature,
        maxTokens,
      });
      logInfo('[AutomationsAI] generateAIChat retornou com sucesso', {
        provider: result.provider,
        model: result.model,
        textLength: result.text?.length || 0,
      });
    } catch (aiError: any) {
      logError('[AutomationsAI] Erro ao chamar generateAIChat', aiError);
      
      // Mensagem de erro mais específica baseada no tipo de erro
      let userMessage = 'Erro ao processar com IA. Verifique se a configuração de IA está correta.';
      
      if (aiError?.message?.includes('Saldo insuficiente') || aiError?.message?.includes('Insufficient Balance')) {
        userMessage = 'Saldo insuficiente na conta do provedor de IA. Por favor, adicione créditos à sua conta do provedor configurado (DeepSeek).';
      } else if (aiError?.message?.includes('Credenciais inválidas') || aiError?.message?.includes('401') || aiError?.message?.includes('403')) {
        userMessage = 'Credenciais inválidas. Verifique se a API Key está correta nas configurações de IA.';
      } else if (aiError?.message?.includes('Nenhum provedor de IA configurado')) {
        userMessage = 'Nenhum provedor de IA configurado. Configure um provedor de IA nas Configurações > Integrações > Provedores de IA.';
      } else if (aiError?.message) {
        userMessage = aiError.message;
      }
      
      return c.json(
        errorResponse(userMessage, {
          details: aiError?.message,
          errorType: 'ai_provider_error',
        }),
        500,
      );
    }

    if (!result || !result.text) {
      logError('[AutomationsAI] Resultado vazio do generateAIChat', { result });
      return c.json(
        errorResponse('IA não retornou resposta. Tente novamente.'),
        500,
      );
    }

    // Função para extrair JSON do texto (pode ter markdown ou texto antes/depois)
    function extractJSONFromText(text: string): any | null {
      if (!text || !text.trim()) return null;
      
      // 1. Tentar parse direto
      try {
        return JSON.parse(text.trim());
      } catch {
        // Continua para outras tentativas
      }
      
      // 2. Procurar por blocos de código markdown (```json ... ``` ou ``` ... ```)
      // Regex melhorada para capturar blocos markdown com ou sem "json"
      const jsonBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/g;
      let match;
      while ((match = jsonBlockRegex.exec(text)) !== null) {
        try {
          const jsonContent = match[1].trim();
          if (jsonContent) {
            return JSON.parse(jsonContent);
          }
        } catch {
          // Continua procurando
        }
      }
      
      // 2b. Tentar também sem o "json" no início (apenas ``` ... ```)
      const codeBlockRegex = /```\s*\n?([\s\S]*?)\n?```/g;
      let codeMatch;
      while ((codeMatch = codeBlockRegex.exec(text)) !== null) {
        try {
          const jsonContent = codeMatch[1].trim();
          // Verificar se parece JSON (começa com { ou [)
          if (jsonContent && (jsonContent.startsWith('{') || jsonContent.startsWith('['))) {
            return JSON.parse(jsonContent);
          }
        } catch {
          // Continua procurando
        }
      }
      
      // 3. Procurar por objeto JSON entre chaves { ... }
      const jsonObjectRegex = /\{[\s\S]*\}/;
      const jsonMatch = text.match(jsonObjectRegex);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          // Continua
        }
      }
      
      // 4. Tentar encontrar JSON válido em qualquer parte do texto
      // Procura por padrões que começam com { e terminam com }
      let braceCount = 0;
      let startIndex = -1;
      for (let i = 0; i < text.length; i++) {
        if (text[i] === '{') {
          if (startIndex === -1) startIndex = i;
          braceCount++;
        } else if (text[i] === '}') {
          braceCount--;
          if (braceCount === 0 && startIndex !== -1) {
            const jsonCandidate = text.substring(startIndex, i + 1);
            try {
              return JSON.parse(jsonCandidate);
            } catch {
              // Continua procurando
            }
            startIndex = -1;
          }
        }
      }
      
      return null;
    }

    // Tentar parsear como JSON (automação completa)
    let definition: AutomationDefinition | null = null;
    let aiInterpretationSummary: string | undefined = undefined;
    let impactDescription: string | undefined = undefined;
    let isConversational = false;
    
    try {
      const parsed = extractJSONFromText(result.text);
      
      if (!parsed) {
        // Não encontrou JSON válido
        isConversational = true;
        logInfo('[AutomationsAI] Nenhum JSON encontrado no texto', { text: result.text.substring(0, 200) });
      } else {
        // Verificar se tem estrutura com definition separado
        if (parsed.definition) {
          definition = parsed.definition;
          aiInterpretationSummary = parsed.ai_interpretation_summary;
          impactDescription = parsed.impact_description;
        } else {
          // Formato antigo: JSON direto é a definition
          definition = parsed;
        }
        
        // Verificar se é uma automação válida
        if (!definition?.name || !definition?.trigger || !definition?.actions?.length) {
          isConversational = true; // Não é automação completa, é resposta conversacional
          definition = null;
          logInfo('[AutomationsAI] JSON encontrado mas não é automação válida', { 
            hasName: !!definition?.name,
            hasTrigger: !!definition?.trigger,
            hasActions: !!definition?.actions?.length 
          });
        }
      }
    } catch (error: any) {
      // Erro ao processar JSON
      isConversational = true;
      logError('[AutomationsAI] Erro ao processar JSON', { 
        error: error?.message,
        text: result.text.substring(0, 200) 
      });
    }

    // Se for modo conversacional e não gerou automação, retornar resposta conversacional
    if (body.conversationMode && isConversational) {
      return c.json(
        successResponse({
          definition: null,
          conversationalResponse: result.text,
          provider: result.provider,
          model: result.model,
          rawText: result.text,
        }),
      );
    }

    // Se não for modo conversacional e não gerou automação, retornar erro
    if (!definition) {
      logError('[AutomationsAI] Falha ao gerar automação - retornando erro com rawText para debug', {
        textLength: result.text?.length || 0,
        textPreview: result.text?.substring(0, 500) || 'N/A',
        provider: result.provider,
        model: result.model,
      });
      
      return c.json(
        errorResponse('IA retornou um formato inválido. Tente reformular o pedido ou forneça mais detalhes.', {
          rawText: result.text, // ✅ Incluir rawText para debug
          provider: result.provider,
          model: result.model,
          textLength: result.text?.length || 0,
        }),
        422,
      );
    }

    return c.json(
      successResponse({
        definition,
        ai_interpretation_summary: aiInterpretationSummary,
        impact_description: impactDescription,
        provider: result.provider,
        model: result.model,
        rawText: result.text,
      }),
    );
  } catch (error: any) {
    logError('[AutomationsAI] Erro inesperado', error);
    return c.json(
      errorResponse('Falha ao interpretar automação em linguagem natural', {
        details: error?.message,
      }),
      500,
    );
  }
}




