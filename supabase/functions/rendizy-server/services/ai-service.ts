import { getSupabaseClient } from '../kv_store.tsx';
import { decryptSensitive } from '../utils-crypto.ts';
import { logInfo, logError } from '../utils.ts';

export type AIChatRole = 'system' | 'user' | 'assistant';

export interface AIChatMessage {
  role: AIChatRole;
  content: string;
}

export interface AIResolvedConfig {
  organizationId: string;
  provider: string;
  baseUrl: string;
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  promptTemplate: string;
  apiKey: string;
}

export interface GenerateAIChatOptions {
  organizationId: string;
  messages: AIChatMessage[];
  temperature?: number;
  maxTokens?: number;
  modelOverride?: string;
  providerOverride?: string;
  baseUrlOverride?: string;
  apiKeyOverride?: string;
}

export interface AIChatResult {
  provider: string;
  model: string;
  text: string;
  httpStatus: number;
  rawResponse?: any;
}

const DEFAULT_PROMPT = 'Você é o copiloto oficial do Rendizy. Responda sempre em português brasileiro.';

async function fetchAIConfig(organizationId: string): Promise<AIResolvedConfig> {
  logInfo('[AIService] Buscando configuração de IA ativa', { organizationId });
  
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('ai_provider_configs')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    logError('[AIService] Erro ao buscar configuração', error);
    throw new Error('Erro ao buscar configuração de IA');
  }

  if (!data) {
    logError('[AIService] Nenhuma configuração encontrada', { organizationId });
    throw new Error('Nenhum provedor de IA configurado para esta organização');
  }

  logInfo('[AIService] Configuração encontrada', { 
    provider: data.provider, 
    hasApiKey: !!data.api_key_encrypted,
    enabled: data.enabled 
  });

  if (!data.api_key_encrypted) {
    logError('[AIService] API Key não encontrada na configuração', { organizationId, provider: data.provider });
    throw new Error('Provedor configurado sem API Key armazenada');
  }

  let apiKey: string;
  try {
    apiKey = await decryptSensitive(data.api_key_encrypted);
    logInfo('[AIService] API Key descriptografada com sucesso', { provider: data.provider });
  } catch (decryptError: any) {
    logError('[AIService] Erro ao descriptografar API Key', decryptError);
    throw new Error(`Erro ao descriptografar API Key: ${decryptError?.message || 'Erro desconhecido'}`);
  }

  return {
    organizationId,
    provider: data.provider,
    baseUrl: data.base_url,
    defaultModel: data.default_model,
    temperature: Number(data.temperature ?? 0.2),
    maxTokens: Number(data.max_tokens ?? 512),
    promptTemplate: data.prompt_template || DEFAULT_PROMPT,
    apiKey,
  };
}

function ensureSystemPrompt(messages: AIChatMessage[], promptTemplate: string): AIChatMessage[] {
  const hasSystem = messages.some((msg) => msg.role === 'system');
  if (hasSystem) {
    return messages;
  }
  return [
    { role: 'system', content: promptTemplate || DEFAULT_PROMPT },
    ...messages,
  ];
}

function sanitizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '');
}

function buildChatUrl(provider: string, baseUrl: string, model: string) {
  const sanitized = sanitizeBaseUrl(baseUrl);

  if (provider === 'huggingface') {
    const encodedModel = encodeURIComponent(model);
    return `${sanitized}/models/${encodedModel}`;
  }

  if (provider === 'anthropic') {
    // Anthropic usa /v1/messages
    return sanitized.endsWith('/messages') ? sanitized : `${sanitized}/messages`;
  }

  if (provider === 'google-gemini') {
    // Google Gemini usa /models/{model}:generateContent
    const modelPath = model.includes(':') ? model : `${model}:generateContent`;
    return sanitized.endsWith('/generateContent') 
      ? sanitized 
      : `${sanitized}/models/${modelPath}`;
  }

  if (provider === 'azure-openai') {
    if (sanitized.includes('/chat/completions')) {
      return sanitized;
    }
    const hasQuery = sanitized.includes('?');
    const apiVersion = hasQuery ? '' : '?api-version=2024-02-01';
    return `${sanitized}/chat/completions${apiVersion}`;
  }

  // OpenAI-compatible (OpenAI, DeepSeek, Groq, Together, etc.)
  return sanitized.endsWith('/chat/completions')
    ? sanitized
    : `${sanitized}/chat/completions`;
}

function buildProviderHeaders(provider: string, apiKey: string) {
  if (provider === 'azure-openai') {
    return {
      'api-key': apiKey,
      'Content-Type': 'application/json',
    };
  }

  if (provider === 'anthropic') {
    return {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    };
  }

  if (provider === 'google-gemini') {
    return {
      'Content-Type': 'application/json',
    };
  }

  if (provider === 'huggingface') {
    return {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  // OpenAI-compatible (OpenAI, DeepSeek, Groq, Together, etc.)
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };
}

function flattenMessages(messages: AIChatMessage[]): string {
  return messages
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n\n');
}

export async function generateAIChat(options: GenerateAIChatOptions): Promise<AIChatResult> {
  const config = await fetchAIConfig(options.organizationId);
  const provider = options.providerOverride || config.provider;
  const baseUrl = options.baseUrlOverride || config.baseUrl;
  const model = options.modelOverride || config.defaultModel;
  const temperature = options.temperature ?? config.temperature ?? 0.2;
  const maxTokens = options.maxTokens ?? config.maxTokens ?? 512;
  const apiKey = options.apiKeyOverride || config.apiKey;
  const messages = ensureSystemPrompt(options.messages, config.promptTemplate);

  logInfo(`[AIService] Gerando resposta com provider ${provider} para org ${options.organizationId}`);

  const url = buildChatUrl(provider, baseUrl, model);
  const headers = buildProviderHeaders(provider, apiKey);

  let response: Response;
  let payload: any;

  if (provider === 'huggingface') {
    payload = {
      inputs: flattenMessages(messages),
      parameters: {
        temperature,
        max_new_tokens: maxTokens,
        return_full_text: false,
      },
    };
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } else if (provider === 'anthropic') {
    // Anthropic API format
    const systemMessage = messages.find(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');
    payload = {
      model,
      max_tokens: maxTokens,
      temperature,
      messages: otherMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    };
    if (systemMessage) {
      payload.system = systemMessage.content;
    }
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } else if (provider === 'google-gemini') {
    // Google Gemini API format
    const systemInstruction = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');
    payload = {
      contents: conversationMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        responseMimeType: 'application/json', // ✅ Forçar resposta JSON puro
      },
    };
    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction.content }],
      };
    }
    // Gemini API key vai na URL, não no header
    const urlWithKey = `${url}?key=${apiKey}`;
    response = await fetch(urlWithKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } else {
    // OpenAI-compatible (OpenAI, DeepSeek, Groq, Together, Azure, etc.)
    payload = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    };
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  }

  const httpStatus = response.status;
  const textBody = await response.text();
  let json: any = null;
  try {
    json = textBody ? JSON.parse(textBody) : null;
  } catch {
    json = textBody;
  }

  if (!response.ok) {
    logError('[AIService] Erro ao chamar provider', { status: httpStatus, body: json });
    
    // Mensagens de erro mais amigáveis para casos específicos
    let errorMessage = 'Falha ao chamar provedor de IA';
    
    if (httpStatus === 402) {
      errorMessage = 'Saldo insuficiente na conta do provedor de IA. Por favor, adicione créditos à sua conta do provedor configurado.';
    } else if (httpStatus === 401 || httpStatus === 403) {
      errorMessage = 'Credenciais inválidas ou sem permissão. Verifique se a API Key está correta e ativa.';
    } else if (httpStatus === 429) {
      errorMessage = 'Limite de requisições excedido. Tente novamente em alguns instantes.';
    } else if (httpStatus === 500 || httpStatus === 502 || httpStatus === 503) {
      errorMessage = 'Serviço de IA temporariamente indisponível. Tente novamente em alguns instantes.';
    } else {
      // Tentar extrair mensagem do JSON de erro
      const apiErrorMessage = typeof json === 'string' 
        ? json 
        : json?.error?.message || json?.message || json?.error || 'Erro desconhecido';
      
      errorMessage = `Erro ao processar com IA: ${apiErrorMessage}`;
    }
    
    throw new Error(errorMessage);
  }

  let text = '';
  if (provider === 'huggingface') {
    if (Array.isArray(json)) {
      text = json[0]?.generated_text || '';
    } else if (typeof json?.generated_text === 'string') {
      text = json.generated_text;
    } else {
      text = typeof json === 'string' ? json : JSON.stringify(json);
    }
  } else if (provider === 'anthropic') {
    // Anthropic retorna { content: [{ type: 'text', text: '...' }] }
    text = json?.content?.[0]?.text?.trim() || '';
  } else if (provider === 'google-gemini') {
    // Gemini retorna { candidates: [{ content: { parts: [{ text: '...' }] } }] }
    text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  } else {
    // OpenAI-compatible
    text = json?.choices?.[0]?.message?.content?.trim() || '';
  }

  if (!text) {
    text = typeof json === 'string' ? json : JSON.stringify(json);
  }

  return {
    provider,
    model,
    text,
    httpStatus,
    rawResponse: json,
  };
}




