import type { Context } from 'npm:hono';
import { getSupabaseClient } from './kv_store.tsx';
import { getOrganizationIdForRequest } from './utils-multi-tenant.ts';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  logInfo,
  logError,
} from './utils.ts';
import { encryptSensitive, decryptSensitive } from './utils-crypto.ts';

interface UpsertAIConfigPayload {
  id?: string; // Se fornecido, edita configuração existente
  name?: string; // Nome descritivo da configuração
  provider: string;
  baseUrl: string;
  defaultModel: string;
  enabled?: boolean;
  isActive?: boolean; // Se true, ativa esta configuração e desativa outras
  temperature?: number;
  maxTokens?: number;
  promptTemplate?: string;
  notes?: string;
  apiKey?: string;
}

// Listar todas as configurações (timeline)
export async function listAIProviderConfigs(c: Context) {
  try {
    const client = getSupabaseClient();
    const organizationId = await getOrganizationIdForRequest(c);

    logInfo(`[AI] Listando configurações para org ${organizationId}`);

    const { data, error } = await client
      .from('ai_provider_configs')
      .select('id, name, provider, base_url, default_model, enabled, is_active, temperature, max_tokens, notes, created_at, updated_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) {
      logError('[AI] Erro ao listar configs', error);
      return c.json(errorResponse('Erro ao listar configurações de IA', { details: error.message }), 500);
    }

    const configs = (data || []).map(config => ({
      ...config,
      hasApiKey: true, // Sempre true se existe no banco
    }));

    return c.json(successResponse({
      configs,
      organizationId,
    }));
  } catch (error: any) {
    logError('[AI] Erro inesperado ao listar configs', error);
    return c.json(errorResponse('Erro ao listar configurações de IA', { details: error.message }), 500);
  }
}

// Buscar configuração ativa (compatibilidade com código existente)
export async function getAIProviderConfig(c: Context) {
  try {
    const client = getSupabaseClient();
    const organizationId = await getOrganizationIdForRequest(c);

    logInfo(`[AI] Buscando configuração ativa para org ${organizationId}`);

    const { data, error } = await client
      .from('ai_provider_configs')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      logError('[AI] Erro ao buscar config', error);
      return c.json(errorResponse('Erro ao buscar configuração de IA', { details: error.message }), 500);
    }

    if (!data) {
      return c.json(successResponse({
        exists: false,
        organizationId,
      }));
    }

    const { api_key_encrypted, ...rest } = data;

    return c.json(successResponse({
      ...rest,
      organizationId,
      hasApiKey: Boolean(api_key_encrypted),
      exists: true,
    }));
  } catch (error: any) {
    logError('[AI] Erro inesperado ao buscar config', error);
    return c.json(errorResponse('Erro ao buscar configuração de IA', { details: error.message }), 500);
  }
}

export async function upsertAIProviderConfig(c: Context) {
  try {
    const body = await c.req.json<UpsertAIConfigPayload>();
    const client = getSupabaseClient();
    const organizationId = await getOrganizationIdForRequest(c);

    logInfo(`[AI] Salvando configuração para org ${organizationId}: ${body.provider}`);
    logInfo(`[AI] Payload recebido:`, { 
      provider: body.provider, 
      baseUrl: body.baseUrl, 
      defaultModel: body.defaultModel,
      enabled: body.enabled,
      hasApiKey: !!body.apiKey 
    });

    if (!body.provider || !body.baseUrl || !body.defaultModel) {
      return c.json(validationErrorResponse('provider, baseUrl e defaultModel são obrigatórios'), 400);
    }

    // Verificar se a organização existe (para evitar foreign key constraint error)
    const { data: orgCheck, error: orgError } = await client
      .from('organizations')
      .select('id')
      .eq('id', organizationId)
      .maybeSingle();

    if (orgError) {
      logError('[AI] Erro ao verificar organização', orgError);
      return c.json(errorResponse('Erro ao verificar organização', { details: orgError.message }), 500);
    }

    if (!orgCheck) {
      logError(`[AI] Organização ${organizationId} não encontrada`);
      return c.json(errorResponse('Organização não encontrada', { details: `Organization ${organizationId} does not exist` }), 404);
    }

    // Se tem ID, está editando uma configuração existente
    let existingConfig: any = null;
    if (body.id) {
      const { data: existing } = await client
        .from('ai_provider_configs')
        .select('*')
        .eq('id', body.id)
        .eq('organization_id', organizationId)
        .maybeSingle();
      
      if (!existing) {
        return c.json(errorResponse('Configuração não encontrada'), 404);
      }
      existingConfig = existing;
    }

    // Criptografar API Key se fornecida
    let apiKeyEncrypted = existingConfig?.api_key_encrypted || null;
    if (body.apiKey) {
      try {
        apiKeyEncrypted = await encryptSensitive(body.apiKey);
        logInfo(`[AI] API Key criptografada com sucesso`);
      } catch (encryptError: any) {
        logError('[AI] Erro ao criptografar API Key', encryptError);
        return c.json(errorResponse('Erro ao criptografar API Key', { details: encryptError.message }), 500);
      }
    } else if (!existingConfig) {
      // Se criando nova e não tem API key, é obrigatório
      return c.json(validationErrorResponse('Informe uma API Key para o provedor selecionado'), 400);
    }

    // Se não tem API key e não é edição, erro
    if (!apiKeyEncrypted && !existingConfig) {
      return c.json(validationErrorResponse('Informe uma API Key para o provedor selecionado'), 400);
    }

    // Garantir que temperature está no range válido (0-1 para NUMERIC(3,2))
    const temperature = Math.max(0, Math.min(1, body.temperature ?? existingConfig?.temperature ?? 0.2));
    
    // Se isActive é true, desativar todas as outras configurações da organização
    const isActive = body.isActive ?? (body.id ? existingConfig?.is_active : true);
    
    if (isActive) {
      await client
        .from('ai_provider_configs')
        .update({ is_active: false })
        .eq('organization_id', organizationId)
        .neq('id', body.id || '00000000-0000-0000-0000-000000000000'); // Se não tem ID ainda, usar UUID inválido
    }

    // Gerar nome padrão se não fornecido
    const providerNames: Record<string, string> = {
      'openai': 'OpenAI (ChatGPT)',
      'deepseek': 'DeepSeek',
      'anthropic': 'Anthropic (Claude)',
      'google-gemini': 'Google Gemini',
      'groq': 'Groq',
      'together': 'Together AI',
      'azure-openai': 'Azure OpenAI',
      'huggingface': 'Hugging Face',
      'custom': 'Configuração Personalizada',
    };
    
    const configName = body.name || existingConfig?.name || providerNames[body.provider] || `Configuração ${body.provider}`;
    
    const payload: any = {
      organization_id: organizationId,
      name: configName,
      provider: body.provider,
      base_url: body.baseUrl,
      default_model: body.defaultModel,
      enabled: body.enabled ?? existingConfig?.enabled ?? true,
      is_active: isActive,
      temperature: temperature,
      max_tokens: body.maxTokens ?? existingConfig?.max_tokens ?? 512,
      prompt_template: body.promptTemplate ?? existingConfig?.prompt_template ?? 'Você é o copiloto oficial do Rendizy. Responda sempre em português brasileiro.',
      notes: body.notes ?? existingConfig?.notes ?? null,
    };

    // Só atualizar API key se fornecida
    if (apiKeyEncrypted) {
      payload.api_key_encrypted = apiKeyEncrypted;
    }

    logInfo(`[AI] Tentando ${body.id ? 'atualizar' : 'criar'} configuração:`, { 
      id: body.id,
      organization_id: payload.organization_id,
      provider: payload.provider,
      name: payload.name,
      is_active: payload.is_active,
      enabled: payload.enabled,
      temperature: payload.temperature,
      max_tokens: payload.max_tokens,
      hasApiKey: !!payload.api_key_encrypted
    });

    let result;
    if (body.id) {
      // Atualizar configuração existente
      const { data, error } = await client
        .from('ai_provider_configs')
        .update(payload)
        .eq('id', body.id)
        .eq('organization_id', organizationId)
        .select('*')
        .single();
      
      if (error) {
        logError('[AI] Erro ao atualizar config', error);
        return c.json(errorResponse('Erro ao atualizar configuração de IA', { details: error.message }), 500);
      }
      result = data;
    } else {
      // Criar nova configuração
      const { data, error } = await client
        .from('ai_provider_configs')
        .insert(payload)
        .select('*')
        .single();
      
      if (error) {
        logError('[AI] Erro ao criar config', error);
        return c.json(errorResponse('Erro ao criar configuração de IA', { details: error.message }), 500);
      }
      result = data;
    }

    const { api_key_encrypted, ...rest } = result;

    return c.json(successResponse({
      ...rest,
      organizationId,
      hasApiKey: Boolean(api_key_encrypted),
    }));
  } catch (error: any) {
    logError('[AI] Erro inesperado ao salvar config', error);
    return c.json(errorResponse('Erro ao salvar configuração de IA', { details: error.message }), 500);
  }
}

function buildProviderHeaders(provider: string, apiKey: string) {
  if (provider === 'azure-openai') {
    return {
      'api-key': apiKey,
    };
  }

  if (provider === 'huggingface') {
    return {
      Authorization: `Bearer ${apiKey}`,
    };
  }

  return {
    Authorization: `Bearer ${apiKey}`,
  };
}

function sanitizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/$/, '');
}

function buildModelsUrl(provider: string, baseUrl: string) {
  const sanitized = sanitizeBaseUrl(baseUrl);

  if (provider === 'huggingface') {
    // huggingface inference usa /models
    return `${sanitized}/models`;
  }

  if (provider === 'anthropic') {
    // Anthropic não tem endpoint de listagem de modelos público
    // Retornamos a URL base para teste
    return sanitized;
  }

  if (provider === 'google-gemini') {
    // Gemini usa /models para listar modelos
    return `${sanitized}/models`;
  }

  if (provider === 'azure-openai') {
    // azure deployments usam /models mas podem exigir api-version
    const hasQuery = sanitized.includes('?');
    return hasQuery ? sanitized : `${sanitized}/models`;
  }

  // OpenAI-compatible (OpenAI, DeepSeek, Groq, Together, etc.)
  return `${sanitized}/models`;
}

// Ativar/desativar configuração
export async function toggleAIConfigStatus(c: Context) {
  try {
    const configId = c.req.param('id');
    const body = await c.req.json<{ isActive: boolean }>();
    const client = getSupabaseClient();
    const organizationId = await getOrganizationIdForRequest(c);

    logInfo(`[AI] ${body.isActive ? 'Ativando' : 'Desativando'} configuração ${configId} para org ${organizationId}`);

    // Se está ativando, desativar todas as outras
    if (body.isActive) {
      await client
        .from('ai_provider_configs')
        .update({ is_active: false })
        .eq('organization_id', organizationId)
        .neq('id', configId);
    }

    const { data, error } = await client
      .from('ai_provider_configs')
      .update({ is_active: body.isActive })
      .eq('id', configId)
      .eq('organization_id', organizationId)
      .select('*')
      .single();

    if (error) {
      logError('[AI] Erro ao atualizar status', error);
      return c.json(errorResponse('Erro ao atualizar status da configuração', { details: error.message }), 500);
    }

    if (!data) {
      return c.json(errorResponse('Configuração não encontrada'), 404);
    }

    const { api_key_encrypted, ...rest } = data;

    return c.json(successResponse({
      ...rest,
      organizationId,
      hasApiKey: Boolean(api_key_encrypted),
    }));
  } catch (error: any) {
    logError('[AI] Erro inesperado ao atualizar status', error);
    return c.json(errorResponse('Erro ao atualizar status da configuração', { details: error.message }), 500);
  }
}

// Deletar configuração
export async function deleteAIProviderConfig(c: Context) {
  try {
    const configId = c.req.param('id');
    const client = getSupabaseClient();
    const organizationId = await getOrganizationIdForRequest(c);

    logInfo(`[AI] Deletando configuração ${configId} para org ${organizationId}`);

    const { error } = await client
      .from('ai_provider_configs')
      .delete()
      .eq('id', configId)
      .eq('organization_id', organizationId);

    if (error) {
      logError('[AI] Erro ao deletar config', error);
      return c.json(errorResponse('Erro ao deletar configuração', { details: error.message }), 500);
    }

    return c.json(successResponse({ deleted: true, id: configId }));
  } catch (error: any) {
    logError('[AI] Erro inesperado ao deletar config', error);
    return c.json(errorResponse('Erro ao deletar configuração', { details: error.message }), 500);
  }
}

export async function testAIProviderConfig(c: Context) {
  try {
    const configId = c.req.query('configId'); // Opcional: testar configuração específica
    const client = getSupabaseClient();
    const organizationId = await getOrganizationIdForRequest(c);

    logInfo(`[AI] Testando provedor para org ${organizationId}${configId ? ` (config ${configId})` : ' (ativa)'}`);

    let query = client
      .from('ai_provider_configs')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (configId) {
      query = query.eq('id', configId);
    } else {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      logError('[AI] Erro ao buscar config para teste', error);
      return c.json(errorResponse('Erro ao testar provedor de IA', { details: error.message }), 500);
    }

    if (!data) {
      return c.json(validationErrorResponse('Configure um provedor antes de testar'), 400);
    }

    if (!data.api_key_encrypted) {
      return c.json(validationErrorResponse('API Key não encontrada. Salve novamente a integração.'), 400);
    }

    const apiKey = await decryptSensitive(data.api_key_encrypted);
    const headers = {
      'Content-Type': 'application/json',
      ...buildProviderHeaders(data.provider, apiKey),
    };

    let url = buildModelsUrl(data.provider, data.base_url);
    
    // Google Gemini precisa da API key na URL
    if (data.provider === 'google-gemini') {
      url = `${url}?key=${apiKey}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: data.provider === 'google-gemini' ? { 'Content-Type': 'application/json' } : headers,
    });

    if (!response.ok) {
      const text = await response.text();
      return c.json(errorResponse('Falha ao contatar provedor de IA', {
        status: response.status,
        statusText: response.statusText,
        details: text,
      }), response.status);
    }

    let payload: any = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const modelsCount = Array.isArray(payload?.data) ? payload.data.length : undefined;

    return c.json(successResponse({
      provider: data.provider,
      url,
      httpStatus: response.status,
      modelsCount,
      testedAt: new Date().toISOString(),
    }));
  } catch (error: any) {
    logError('[AI] Erro inesperado ao testar provedor', error);
    return c.json(errorResponse('Erro ao testar provedor de IA', { details: error.message }), 500);
  }
}

