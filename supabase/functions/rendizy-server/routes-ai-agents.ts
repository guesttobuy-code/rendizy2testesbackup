/**
 * RENDIZY - AI Agents Routes
 * 
 * Agentes de IA para coleta automatizada de dados.
 * Primeiro agente: Coletor de Construtoras (scraping de Linktrees)
 */

import { Hono, type Context } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { successResponse, errorResponse } from './utils-response.ts';
import { getOrganizationId } from './utils-get-organization-id.ts';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from './utils-env.ts';
import { decryptSensitive } from './utils-crypto.ts';

const app = new Hono();

// ============================================================================
// ENSURE TABLE EXISTS (Auto-migration)
// ============================================================================

async function ensureConstrutorsTableExists(supabase: ReturnType<typeof createClient>): Promise<void> {
  // Usar RPC para criar tabela se não existir
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS ai_agent_construtoras (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      linktree_url TEXT NOT NULL,
      website_url TEXT,
      notes TEXT,
      is_active BOOLEAN DEFAULT true,
      last_scraped_at TIMESTAMPTZ,
      empreendimentos_count INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_ai_agent_construtoras_org 
      ON ai_agent_construtoras(organization_id);
    
    CREATE INDEX IF NOT EXISTS idx_ai_agent_construtoras_active 
      ON ai_agent_construtoras(organization_id, is_active);
  `;
  
  try {
    // Tentar executar via RPC se existir
    await supabase.rpc('exec_sql', { sql: createTableSQL }).catch(() => {
      // Ignorar erro se RPC não existir
    });
  } catch {
    // Ignorar erros - a tabela pode já existir
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface ConstrutoraScrapeRequest {
  linktree_url: string;
  construtora_name: string;
}

interface ScrapedEmpreendimento {
  nome: string;
  localizacao?: string;
  tipologias?: string[];
  preco_min?: number;
  preco_max?: number;
  status?: string;
  links?: {
    disponibilidade?: string;
    tabela_precos?: string;
    material_vendas?: string;
    decorado_virtual?: string;
    andamento_obra?: string;
    publicidade?: string;
  };
  link_original?: string; // Compatibilidade
  observacoes?: string;
  dados_raw?: Record<string, unknown>;
}

interface AgentExecutionLog {
  agent_id: string;
  status: 'started' | 'running' | 'completed' | 'failed';
  message: string;
  data?: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// GROQ API HELPER
// ============================================================================

async function callGroqAPI(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  model: string = 'llama-3.3-70b-versatile'
): Promise<{ success: boolean; content?: string; error?: string; usage?: Record<string, number> }> {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3, // Baixa para extração de dados estruturados
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `Groq API error: ${response.status} - ${errorData?.error?.message || 'Unknown error'}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage,
    };
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Network error: ${errMessage}`,
    };
  }
}

// ============================================================================
// FETCH URL CONTENT (Simple scraping)
// ============================================================================

async function fetchUrlContent(url: string): Promise<{ success: boolean; html?: string; error?: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    
    // Limitar tamanho para não estourar tokens
    const maxLength = 15000;
    const truncatedHtml = html.length > maxLength 
      ? html.substring(0, maxLength) + '... [truncated]' 
      : html;

    return { success: true, html: truncatedHtml };
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errMessage };
  }
}

// ============================================================================
// EXTRACT LINKS FROM LINKTREE (v2 - Melhorado)
// ============================================================================

interface ExtractedLink {
  url: string;
  text: string;
  category?: string; // disponibilidade, tabela, material, decorado, etc.
}

function extractLinksFromHtml(html: string): ExtractedLink[] {
  const links: ExtractedLink[] = [];
  
  // Regex mais abrangente para capturar links com texto
  // Formato: [Texto do Link](URL) ou href="URL"
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const hrefRegex = /href=["']([^"']+)["'][^>]*>([^<]*)</gi;
  
  let match;

  // Extrair links no formato Markdown (como o fetch_webpage retorna)
  while ((match = markdownLinkRegex.exec(html)) !== null) {
    const text = match[1].trim();
    const url = match[2].trim();
    
    // Filtrar links relevantes para imobiliário
    if (isRelevantLink(url)) {
      links.push({
        url,
        text,
        category: categorizeLink(text, url),
      });
    }
  }

  // Extrair links no formato HTML tradicional
  while ((match = hrefRegex.exec(html)) !== null) {
    const url = match[1].trim();
    const text = match[2].trim();
    
    if (isRelevantLink(url) && !links.find(l => l.url === url)) {
      links.push({
        url,
        text: text || url,
        category: categorizeLink(text, url),
      });
    }
  }

  return links;
}

function isRelevantLink(url: string): boolean {
  // Links a IGNORAR
  const ignorePatterns = [
    'linktr.ee',
    'linktree.com',
    'facebook.com',
    'instagram.com',
    'twitter.com',
    'youtube.com',
    'linkedin.com',
    'mailto:',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.ico',
    'fonts.',
    'analytics',
    'google.com/recaptcha',
    'cookienotice',
    'privacy',
  ];

  const urlLower = url.toLowerCase();
  return !ignorePatterns.some(pattern => urlLower.includes(pattern));
}

function categorizeLink(text: string, url: string): string {
  const textLower = (text || '').toLowerCase();
  const urlLower = url.toLowerCase();

  if (textLower.includes('disponibilidade') || urlLower.includes('painel') || urlLower.includes('mapa')) {
    return 'disponibilidade';
  }
  if (textLower.includes('tabela') || textLower.includes('preço') || textLower.includes('valor')) {
    return 'tabela_precos';
  }
  if (textLower.includes('material') || textLower.includes('book') || textLower.includes('apresent')) {
    return 'material_vendas';
  }
  if (textLower.includes('decorado') || urlLower.includes('matterport') || textLower.includes('tour')) {
    return 'decorado_virtual';
  }
  if (textLower.includes('andamento') || textLower.includes('obra') || textLower.includes('progress')) {
    return 'andamento_obra';
  }
  if (textLower.includes('publicidade') || textLower.includes('mídia') || textLower.includes('campanha')) {
    return 'publicidade';
  }
  if (textLower.includes('planta') || textLower.includes('projeto')) {
    return 'plantas';
  }
  
  return 'outro';
}

// ============================================================================
// MAIN AGENT: CONSTRUTORA SCRAPER
// ============================================================================

async function runConstrutoraScraper(
  apiKey: string,
  linktreeUrl: string,
  construtoraName: string
): Promise<{
  success: boolean;
  empreendimentos: ScrapedEmpreendimento[];
  logs: AgentExecutionLog[];
  error?: string;
  tokensUsed?: number;
}> {
  const logs: AgentExecutionLog[] = [];
  const empreendimentos: ScrapedEmpreendimento[] = [];
  let totalTokens = 0;

  const addLog = (status: AgentExecutionLog['status'], message: string, data?: Record<string, unknown>) => {
    logs.push({
      agent_id: 'construtora-scraper',
      status,
      message,
      data,
      created_at: new Date().toISOString(),
    });
  };

  try {
    // Step 1: Fetch Linktree page
    addLog('started', `Iniciando coleta para ${construtoraName}`);
    addLog('running', `Acessando Linktree: ${linktreeUrl}`);

    const linktreeResult = await fetchUrlContent(linktreeUrl);
    if (!linktreeResult.success) {
      addLog('failed', `Erro ao acessar Linktree: ${linktreeResult.error}`);
      return { success: false, empreendimentos: [], logs, error: linktreeResult.error };
    }

    // Step 2: Extract links com categorização
    const links = extractLinksFromHtml(linktreeResult.html!);
    addLog('running', `Encontrados ${links.length} links externos`, { 
      total: links.length,
      por_categoria: links.reduce((acc, l) => {
        acc[l.category || 'outro'] = (acc[l.category || 'outro'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });

    if (links.length === 0) {
      addLog('completed', 'Nenhum link externo encontrado no Linktree');
      return { success: true, empreendimentos: [], logs };
    }

    // Step 3: Use AI to analyze the Linktree content and links
    addLog('running', 'Analisando conteúdo com IA (Groq)...');

    // Formatar links de forma estruturada para a IA
    const linksFormatted = links.map((l, i) => 
      `${i + 1}. [${l.category?.toUpperCase() || 'LINK'}] "${l.text}" → ${l.url}`
    ).join('\n');

    const analysisPrompt = `Você é um assistente especializado em mercado imobiliário brasileiro.

Analise o conteúdo de um Linktree da construtora "${construtoraName}" e extraia informações sobre seus empreendimentos.

CONTEÚDO DO LINKTREE (resumido):
${linktreeResult.html?.substring(0, 8000)}

LINKS CATEGORIZADOS ENCONTRADOS:
${linksFormatted}

INSTRUÇÕES:
1. Identifique TODOS os nomes de empreendimentos (geralmente são títulos como "Arte Wood", "Murano Residencial", etc.)
2. Agrupe os links por empreendimento (cada empreendimento costuma ter: disponibilidade, tabela, material, decorado virtual)
3. Extraia qualquer informação adicional disponível (localização, tipologias, preços, status)

RESPONDA APENAS JSON VÁLIDO com esta estrutura:
{
  "construtora": "${construtoraName}",
  "empreendimentos": [
    {
      "nome": "Nome do Empreendimento",
      "localizacao": "Bairro, Cidade" ou null,
      "tipologias": ["2 quartos", "3 quartos"] ou null,
      "preco_min": 350000 ou null,
      "preco_max": 800000 ou null,
      "status": "Em obras" | "Lançamento" | "Pronto para morar" | null,
      "links": {
        "disponibilidade": "https://..." ou null,
        "tabela_precos": "https://..." ou null,
        "material_vendas": "https://..." ou null,
        "decorado_virtual": "https://..." ou null,
        "andamento_obra": "https://..." ou null
      },
      "observacoes": "Qualquer info adicional" ou null
    }
  ],
  "total_empreendimentos": 0,
  "links_nao_identificados": ["url1", "url2"]
}

IMPORTANTE: Se um empreendimento aparece no conteúdo, inclua-o mesmo sem links.
Responda APENAS o JSON, sem explicações.`;

    const aiResult = await callGroqAPI(apiKey, [
      { role: 'system', content: 'Você extrai dados estruturados de páginas web de construtoras. Responda apenas JSON válido.' },
      { role: 'user', content: analysisPrompt },
    ]);

    if (!aiResult.success) {
      addLog('failed', `Erro na análise com IA: ${aiResult.error}`);
      return { success: false, empreendimentos: [], logs, error: aiResult.error };
    }

    totalTokens += (aiResult.usage?.total_tokens || 0);

    // Step 4: Parse AI response
    try {
      // Tentar limpar o JSON se vier com markdown
      let jsonContent = aiResult.content || '';
      if (jsonContent.includes('```json')) {
        jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      }
      if (jsonContent.includes('```')) {
        jsonContent = jsonContent.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(jsonContent.trim());

      if (parsed.empreendimentos && Array.isArray(parsed.empreendimentos)) {
        for (const emp of parsed.empreendimentos) {
          empreendimentos.push({
            nome: emp.nome || 'Sem nome',
            localizacao: emp.localizacao,
            tipologias: emp.tipologias,
            preco_min: emp.preco_min,
            preco_max: emp.preco_max,
            status: emp.status,
            link_original: emp.link_original,
            dados_raw: emp,
          });
        }
      }

      addLog('completed', `Coleta finalizada! ${empreendimentos.length} empreendimentos encontrados`, {
        total_empreendimentos: empreendimentos.length,
        tokens_usados: totalTokens,
      });

    } catch (parseError: unknown) {
      const errMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
      addLog('failed', `Erro ao processar resposta da IA: ${errMessage}`, {
        raw_response: aiResult.content?.substring(0, 500),
      });
      return { 
        success: false, 
        empreendimentos: [], 
        logs, 
        error: `Erro ao processar JSON: ${errMessage}` 
      };
    }

    return {
      success: true,
      empreendimentos,
      logs,
      tokensUsed: totalTokens,
    };

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    addLog('failed', `Erro inesperado: ${errMessage}`);
    return { success: false, empreendimentos: [], logs, error: errMessage };
  }
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /ai-agents/test-scraper
 * Testa o agente de scraping com uma URL de Linktree
 */
app.post('/test-scraper', async (c: Context) => {
  try {
    const body = await c.req.json();
    const { linktree_url, construtora_name, api_key } = body;

    if (!linktree_url) {
      return c.json(errorResponse('linktree_url é obrigatório'), 400);
    }

    if (!construtora_name) {
      return c.json(errorResponse('construtora_name é obrigatório'), 400);
    }

    // Buscar API key do provider de IA se não foi fornecida
    let groqApiKey = api_key;

    if (!groqApiKey) {
      // Tentar buscar do banco de dados (configuração do provider)
      const supabaseUrl = SUPABASE_URL;
      const supabaseKey = SUPABASE_SERVICE_ROLE_KEY;
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const orgId = await getOrganizationId(c);
        
        console.log('[AI-AGENTS] Buscando API key para org:', orgId);
        
        if (orgId) {
          const { data: config, error: configError } = await supabase
            .from('ai_provider_configs')
            .select('api_key_encrypted, provider')
            .eq('organization_id', orgId)
            .eq('is_active', true)
            .in('provider', ['groq', 'groq-compound'])
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

          console.log('[AI-AGENTS] Config encontrada:', { 
            hasConfig: !!config, 
            provider: config?.provider,
            hasEncryptedKey: !!config?.api_key_encrypted,
            error: configError?.message
          });

          if (config?.api_key_encrypted) {
            try {
              // Descriptografar a API key
              groqApiKey = await decryptSensitive(config.api_key_encrypted);
              console.log('[AI-AGENTS] API key descriptografada com sucesso');
            } catch (decryptError: unknown) {
              const errMsg = decryptError instanceof Error ? decryptError.message : 'Unknown error';
              console.error('[AI-AGENTS] Erro ao descriptografar API key:', errMsg);
            }
          }
        }
      }
    }

    if (!groqApiKey) {
      return c.json(errorResponse('API Key do Groq não configurada. Configure em Integrações → Provedor de IA'), 400);
    }

    // Executar o agente
    const result = await runConstrutoraScraper(groqApiKey, linktree_url, construtora_name);

    return c.json(successResponse({
      ...result,
      message: result.success 
        ? `Coleta finalizada! ${result.empreendimentos.length} empreendimentos encontrados.`
        : `Falha na coleta: ${result.error}`,
    }));

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AI-AGENTS] Erro no test-scraper:', error);
    return c.json(errorResponse('Erro interno', { details: errMessage }), 500);
  }
});

/**
 * POST /ai-agents/scrape-construtora
 * Executa o agente de scraping e salva os dados no banco
 */
app.post('/scrape-construtora', async (c: Context) => {
  try {
    const supabaseUrl = SUPABASE_URL;
    const supabaseKey = SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const orgId = await getOrganizationId(c);
    if (!orgId) {
      return c.json(errorResponse('Organização não encontrada'), 401);
    }

    const body = await c.req.json();
    const { linktree_url, construtora_name, construtora_id } = body;

    if (!linktree_url || !construtora_name) {
      return c.json(errorResponse('linktree_url e construtora_name são obrigatórios'), 400);
    }

    // Buscar API key configurada
    const { data: config } = await supabase
      .from('ai_provider_configs')
      .select('api_key')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .in('provider', ['groq', 'groq-compound'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (!config?.api_key) {
      return c.json(errorResponse('Configure o Groq em Integrações → Provedor de IA'), 400);
    }

    // Executar agente
    const result = await runConstrutoraScraper(config.api_key, linktree_url, construtora_name);

    // Salvar logs de execução
    await supabase.from('ai_agent_execution_logs').insert({
      organization_id: orgId,
      agent_type: 'construtora-scraper',
      input_data: { linktree_url, construtora_name, construtora_id },
      output_data: result,
      status: result.success ? 'completed' : 'failed',
      tokens_used: result.tokensUsed || 0,
      error_message: result.error,
    });

    // Se sucesso, salvar empreendimentos (tabela a ser criada)
    if (result.success && result.empreendimentos.length > 0) {
      // Por enquanto só retorna os dados - tabela será criada depois
      console.log(`[AI-AGENTS] ${result.empreendimentos.length} empreendimentos coletados para ${construtora_name}`);
    }

    return c.json(successResponse(result));

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AI-AGENTS] Erro no scrape-construtora:', error);
    return c.json(errorResponse('Erro interno', { details: errMessage }), 500);
  }
});

/**
 * GET /ai-agents/logs
 * Lista logs de execução dos agentes
 */
app.get('/logs', async (c: Context) => {
  try {
    const supabaseUrl = SUPABASE_URL;
    const supabaseKey = SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const orgId = await getOrganizationId(c);
    if (!orgId) {
      return c.json(errorResponse('Organização não encontrada'), 401);
    }

    const { data, error } = await supabase
      .from('ai_agent_execution_logs')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return c.json(errorResponse('Erro ao buscar logs', { details: error.message }), 500);
    }

    return c.json(successResponse({ logs: data || [] }));

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AI-AGENTS] Erro ao buscar logs:', error);
    return c.json(errorResponse('Erro interno', { details: errMessage }), 500);
  }
});

// ============================================================================
// CONSTRUTORAS CRUD (Cadastro Persistente)
// ============================================================================

/**
 * GET /ai-agents/construtoras
 * Lista construtoras cadastradas
 */
app.get('/construtoras', async (c: Context) => {
  try {
    const supabaseUrl = SUPABASE_URL;
    const supabaseKey = SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const orgId = await getOrganizationId(c);
    if (!orgId) {
      return c.json(errorResponse('Organização não encontrada'), 401);
    }

    const { data, error } = await supabase
      .from('ai_agent_construtoras')
      .select('*')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      // Tabela pode não existir ainda
      if (error.code === '42P01') {
        return c.json(successResponse({ construtoras: [] }));
      }
      return c.json(errorResponse('Erro ao buscar construtoras', { details: error.message }), 500);
    }

    return c.json(successResponse({ construtoras: data || [] }));

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AI-AGENTS] Erro ao buscar construtoras:', error);
    return c.json(errorResponse('Erro interno', { details: errMessage }), 500);
  }
});

/**
 * POST /ai-agents/construtoras
 * Cadastra nova construtora
 */
app.post('/construtoras', async (c: Context) => {
  try {
    const supabaseUrl = SUPABASE_URL;
    const supabaseKey = SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const orgId = await getOrganizationId(c);
    if (!orgId) {
      return c.json(errorResponse('Organização não encontrada'), 401);
    }

    const body = await c.req.json();
    const { name, linktree_url, website_url, notes } = body;

    if (!name || !linktree_url) {
      return c.json(errorResponse('name e linktree_url são obrigatórios'), 400);
    }

    // Verificar se já existe
    const { data: existing } = await supabase
      .from('ai_agent_construtoras')
      .select('id')
      .eq('organization_id', orgId)
      .eq('linktree_url', linktree_url)
      .single();

    if (existing) {
      return c.json(errorResponse('Construtora com este Linktree já cadastrada'), 400);
    }

    const { data, error } = await supabase
      .from('ai_agent_construtoras')
      .insert({
        organization_id: orgId,
        name,
        linktree_url,
        website_url,
        notes,
        is_active: true,
        last_scraped_at: null,
        empreendimentos_count: 0,
      })
      .select()
      .single();

    if (error) {
      return c.json(errorResponse('Erro ao cadastrar construtora', { details: error.message }), 500);
    }

    return c.json(successResponse({ construtora: data }));

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AI-AGENTS] Erro ao cadastrar construtora:', error);
    return c.json(errorResponse('Erro interno', { details: errMessage }), 500);
  }
});

/**
 * PUT /ai-agents/construtoras/:id
 * Atualiza construtora
 */
app.put('/construtoras/:id', async (c: Context) => {
  try {
    const supabaseUrl = SUPABASE_URL;
    const supabaseKey = SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const orgId = await getOrganizationId(c);
    if (!orgId) {
      return c.json(errorResponse('Organização não encontrada'), 401);
    }

    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, linktree_url, website_url, notes, is_active } = body;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (linktree_url !== undefined) updates.linktree_url = linktree_url;
    if (website_url !== undefined) updates.website_url = website_url;
    if (notes !== undefined) updates.notes = notes;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabase
      .from('ai_agent_construtoras')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', orgId)
      .select()
      .single();

    if (error) {
      return c.json(errorResponse('Erro ao atualizar construtora', { details: error.message }), 500);
    }

    return c.json(successResponse({ construtora: data }));

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AI-AGENTS] Erro ao atualizar construtora:', error);
    return c.json(errorResponse('Erro interno', { details: errMessage }), 500);
  }
});

/**
 * DELETE /ai-agents/construtoras/:id
 * Remove construtora (soft delete)
 */
app.delete('/construtoras/:id', async (c: Context) => {
  try {
    const supabaseUrl = SUPABASE_URL;
    const supabaseKey = SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const orgId = await getOrganizationId(c);
    if (!orgId) {
      return c.json(errorResponse('Organização não encontrada'), 401);
    }

    const id = c.req.param('id');

    // Soft delete
    const { error } = await supabase
      .from('ai_agent_construtoras')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', orgId);

    if (error) {
      return c.json(errorResponse('Erro ao remover construtora', { details: error.message }), 500);
    }

    return c.json(successResponse({ message: 'Construtora removida' }));

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AI-AGENTS] Erro ao remover construtora:', error);
    return c.json(errorResponse('Erro interno', { details: errMessage }), 500);
  }
});

/**
 * POST /ai-agents/construtoras/:id/scrape
 * Executa scraping de uma construtora específica
 */
app.post('/construtoras/:id/scrape', async (c: Context) => {
  try {
    const supabaseUrl = SUPABASE_URL;
    const supabaseKey = SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const orgId = await getOrganizationId(c);
    if (!orgId) {
      return c.json(errorResponse('Organização não encontrada'), 401);
    }

    const id = c.req.param('id');

    // Buscar construtora
    const { data: construtora, error: fetchError } = await supabase
      .from('ai_agent_construtoras')
      .select('*')
      .eq('id', id)
      .eq('organization_id', orgId)
      .single();

    if (fetchError || !construtora) {
      return c.json(errorResponse('Construtora não encontrada'), 404);
    }

    // Buscar API key configurada (com decriptação)
    const { data: config } = await supabase
      .from('ai_provider_configs')
      .select('api_key_encrypted')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .in('provider', ['groq', 'groq-compound'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (!config?.api_key_encrypted) {
      return c.json(errorResponse('Configure o Groq em Integrações → Provedor de IA'), 400);
    }

    // Decriptar API key
    const apiKey = decryptSensitive(config.api_key_encrypted);
    if (!apiKey) {
      return c.json(errorResponse('Erro ao decriptar API key'), 500);
    }

    // Executar agente
    const result = await runConstrutoraScraper(apiKey, construtora.linktree_url, construtora.name);

    // Atualizar última execução
    await supabase
      .from('ai_agent_construtoras')
      .update({ 
        last_scraped_at: new Date().toISOString(),
        empreendimentos_count: result.empreendimentos?.length || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Salvar logs de execução
    await supabase.from('ai_agent_execution_logs').insert({
      organization_id: orgId,
      agent_type: 'construtora-scraper',
      input_data: { construtora_id: id, linktree_url: construtora.linktree_url, construtora_name: construtora.name },
      output_data: result,
      status: result.success ? 'completed' : 'failed',
      tokens_used: result.tokensUsed || 0,
      error_message: result.error,
    });

    return c.json(successResponse(result));

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AI-AGENTS] Erro no scrape de construtora:', error);
    return c.json(errorResponse('Erro interno', { details: errMessage }), 500);
  }
});

/**
 * POST /ai-agents/setup
 * Cria as tabelas necessárias (para ser chamado uma vez)
 */
app.post('/setup', async (c: Context) => {
  try {
    const supabaseUrl = SUPABASE_URL;
    const supabaseKey = SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // SQL para criar tabela
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS ai_agent_construtoras (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          linktree_url TEXT NOT NULL,
          website_url TEXT,
          notes TEXT,
          is_active BOOLEAN DEFAULT true,
          last_scraped_at TIMESTAMPTZ,
          empreendimentos_count INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_ai_agent_construtoras_org 
          ON ai_agent_construtoras(organization_id);
        
        CREATE INDEX IF NOT EXISTS idx_ai_agent_construtoras_active 
          ON ai_agent_construtoras(organization_id, is_active);
      `
    });

    if (error) {
      // Se exec_sql não existir, retornar instruções para criar manualmente
      return c.json(successResponse({
        message: 'RPC exec_sql não disponível. Execute a migração manualmente.',
        migration_file: 'supabase/migrations/20260201_ai_agent_construtoras.sql',
        dashboard_url: 'https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql',
      }));
    }

    return c.json(successResponse({ message: 'Tabelas criadas com sucesso!' }));

  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AI-AGENTS] Erro no setup:', error);
    return c.json(errorResponse('Erro interno', { details: errMessage }), 500);
  }
});

export default app;
