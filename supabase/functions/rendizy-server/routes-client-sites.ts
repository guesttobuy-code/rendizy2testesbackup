// routes-client-sites.ts
// Sistema de gerenciamento de sites customizados por cliente
// Permite importar sites de v0.dev, Bolt.ai, Figma, etc e integrá-los ao RENDIZY

import { Hono } from "npm:hono";
// ✅ REFATORADO v1.0.103.500 - Helper híbrido para organization_id (UUID)
import { getOrganizationIdOrThrow } from "./utils-get-organization-id.ts";
import { getSupabaseClient } from "./kv_store.tsx";
import JSZip from "npm:jszip";
import { 
  SUPABASE_ANON_KEY, 
  SUPABASE_SERVICE_ROLE_KEY, 
  SUPABASE_URL, 
  SUPABASE_PROJECT_REF,
  VERCEL_ACCESS_TOKEN,
  VERCEL_TEAM_ID,
  VERCEL_PROJECT_ID,
  GITHUB_WEBHOOK_SECRET
} from './utils-env.ts';

const app = new Hono();

// ============================================================
// TIPOS
// ============================================================

interface ClientSiteConfig {
  organizationId: string;
  siteName: string;
  template: "custom" | "moderno" | "classico" | "luxo";
  domain?: string; // domínio customizado (ex: www.imobiliaria.com)
  subdomain: string; // subdomínio RENDIZY (ex: imobiliaria.rendizy.app)

  // Customizações visuais
  theme: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
  };

  // Assets
  logo?: string;
  favicon?: string;

  // Configurações do site
  siteConfig: {
    title: string;
    description: string;
    slogan?: string;
    contactEmail: string;
    contactPhone: string;
    socialMedia?: {
      facebook?: string;
      instagram?: string;
      whatsapp?: string;
    };
  };

  // Modalidades ativas
  features: {
    shortTerm: boolean; // Temporada
    longTerm: boolean; // Locação
    sale: boolean; // Venda
  };

  // Provedores de hospedagem (Vercel, Netlify, Cloudflare, etc)
  hostingProviders?: {
    active_provider?: 'vercel' | 'netlify' | 'cloudflare_pages' | 'none';
    vercel?: {
      use_global_token?: boolean;
      access_token?: string;
      team_id?: string;
      project_id?: string;
      project_name?: string;
      domain?: string;
      last_deployment_id?: string;
      last_deployment_url?: string;
      last_deployment_status?: string;
      last_deployment_at?: string;
    };
    netlify?: {
      use_global_token?: boolean;
      access_token?: string;
      site_id?: string;
      site_name?: string;
      domain?: string;
    };
    cloudflare_pages?: {
      access_token?: string;
      account_id?: string;
      project_name?: string;
    };
  };

  // Código do site (HTML/React serializado)
  siteCode?: string; // Código importado de v0.dev, Bolt, etc

  // Fonte original do site (para futura automação de builds)
  source?: "bolt" | "v0" | "figma" | "custom";

  // Arquivo de origem (ex: ZIP enviado ou caminho de storage)
  archivePath?: string;
  archiveUrl?: string;

  // ✅ NOVO: Arquivos extraídos do ZIP para Storage
  extractedBaseUrl?: string; // Base URL pública do Storage (ex: https://...supabase.co/storage/v1/object/public/client-sites)
  extractedFilesCount?: number; // Quantidade de arquivos extraídos

  // Repositório do site (GitHub/Vercel)
  repo?: {
    provider?: 'github' | 'gitlab' | 'bitbucket';
    url?: string;
    branch?: string;
    deployHookUrl?: string;
    vercelProjectUrl?: string;
    webhookSecret?: string;
    lastDeployStatus?: string;
    lastDeployAt?: string;
    lastDeployError?: string;
  };

  // Metadados
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

// ============================================================
// HELPERS
// ============================================================

type ClientSitesAuthContext = {
  token: string;
  session: any;
  user: any;
  organizationId: string | null;
  isSuperAdmin: boolean;
};

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean)
    .forEach((cookie) => {
      const [key, ...rest] = cookie.split("=");
      if (!key || rest.length === 0) return;
      cookies[key] = decodeURIComponent(rest.join("="));
    });
  return cookies;
}

function extractUserTokenFromRequest(c: any): string | undefined {
  // ✅ PRIORIDADE 1: Header customizado usado no frontend (AuthContext)
  const tokenFromHeader = c.req.header("X-Auth-Token");
  if (tokenFromHeader) return tokenFromHeader;

  // ✅ PRIORIDADE 2 (OPCIONAL): Cookie HttpOnly
  // ⚠️ IMPORTANTE: por padrão, DESABILITADO para reduzir risco de um site de cliente
  // (servido no mesmo origin do Supabase Functions) conseguir usar a sessão de um admin.
  // Habilite somente se você souber exatamente o que está fazendo.
  const allowCookieAuth = (Deno.env.get("ENABLE_CLIENT_SITES_COOKIE_AUTH") || "").toLowerCase() === "true";
  if (allowCookieAuth) {
    const cookieHeader = c.req.header("Cookie") || "";
    const cookies = parseCookies(cookieHeader);
    const tokenFromCookie = cookies["rendizy-token"];
    if (tokenFromCookie) return tokenFromCookie;
  }

  // ⚠️ NÃO usar Authorization aqui (normalmente contém o anonKey do Supabase)
  return undefined;
}

async function requireSqlAuth(c: any): Promise<ClientSitesAuthContext | Response> {
  const token = extractUserTokenFromRequest(c);
  if (!token) {
    return c.json({ success: false, error: "Token ausente" }, 401);
  }

  const supabase = getSupabaseClient();

  // Buscar sessão (OAuth2: access_token; legacy: token)
  const { data: byAccessToken, error: errAccess } = await supabase
    .from("sessions")
    .select("*")
    .eq("access_token", token)
    .maybeSingle();

  let session = byAccessToken;
  let sessionError = errAccess;

  if (!session) {
    const { data: byToken, error: errToken } = await supabase
      .from("sessions")
      .select("*")
      .eq("token", token)
      .maybeSingle();
    session = byToken;
    sessionError = errToken;
  }

  if (sessionError || !session) {
    return c.json({ success: false, error: "Sessão inválida ou expirada" }, 401);
  }

  // Verificar expiração (se disponível)
  if (session.expires_at) {
    const expiresAt = new Date(session.expires_at);
    if (Date.now() > expiresAt.getTime()) {
      return c.json({ success: false, error: "Sessão expirada" }, 401);
    }
  }

  const userId = session.user_id;
  if (!userId) {
    return c.json({ success: false, error: "Sessão sem user_id" }, 401);
  }

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("id, type, organization_id")
    .eq("id", userId)
    .maybeSingle();

  if (userError || !user) {
    return c.json({ success: false, error: "Usuário não encontrado" }, 401);
  }

  const isSuperAdmin = user.type === "superadmin";
  const organizationId = session.organization_id || user.organization_id || null;

  return {
    token,
    session,
    user,
    organizationId,
    isSuperAdmin,
  };
}

async function requireOrganizationAccess(
  c: any,
  targetOrganizationId: string
): Promise<ClientSitesAuthContext | Response> {
  const auth = await requireSqlAuth(c);
  if (auth instanceof Response) return auth;

  if (auth.isSuperAdmin) return auth;

  if (!auth.organizationId) {
    return c.json({ success: false, error: "Usuário sem organization_id" }, 403);
  }

  if (auth.organizationId !== targetOrganizationId) {
    return c.json(
      { success: false, error: "Acesso negado para esta organização" },
      403
    );
  }

  return auth;
}

function generateSubdomain(organizationName: string): string {
  return organizationName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Converter SQL row para ClientSiteConfig
function sqlToClientSiteConfig(row: any): ClientSiteConfig {
  return {
    organizationId: row.organization_id,
    siteName: row.site_name,
    template: row.template,
    subdomain: row.subdomain,
    domain: row.domain || undefined,
    theme: row.theme || {},
    logo: row.logo_url || undefined,
    favicon: row.favicon_url || undefined,
    siteConfig: row.site_config || {},
    features: row.features || {},
    siteCode: row.site_code || undefined,
    archivePath: row.archive_path || undefined,
    archiveUrl: row.archive_url || undefined,
    extractedBaseUrl: row.extracted_base_url || undefined,
    extractedFilesCount: row.extracted_files_count || undefined,
    repo: {
      provider: row.repo_provider || undefined,
      url: row.repo_url || undefined,
      branch: row.repo_branch || undefined,
      deployHookUrl: row.repo_deploy_hook_url || undefined,
      vercelProjectUrl: row.repo_vercel_project_url || undefined,
      webhookSecret: row.repo_webhook_secret || undefined,
      lastDeployStatus: row.repo_last_deploy_status || undefined,
      lastDeployAt: row.repo_last_deploy_at || undefined,
      lastDeployError: row.repo_last_deploy_error || undefined,
    },
    hostingProviders: row.hosting_providers || undefined,
    source: row.source || "custom",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isActive: row.is_active,
  };
}

// Converter ClientSiteConfig para SQL row
function clientSiteConfigToSql(config: ClientSiteConfig): any {
  return {
    organization_id: config.organizationId,
    site_name: config.siteName,
    template: config.template,
    subdomain: config.subdomain,
    domain: config.domain || null,
    theme: config.theme,
    logo_url: config.logo || null,
    favicon_url: config.favicon || null,
    site_config: config.siteConfig,
    features: config.features,
    hosting_providers: config.hostingProviders || {},
    site_code: config.siteCode || null,
    archive_path: config.archivePath || null,
    archive_url: config.archiveUrl || null,
    extracted_base_url: config.extractedBaseUrl || null,
    extracted_files_count: config.extractedFilesCount || null,
    repo_provider: config.repo?.provider || null,
    repo_url: config.repo?.url || null,
    repo_branch: config.repo?.branch || null,
    repo_deploy_hook_url: config.repo?.deployHookUrl || null,
    repo_vercel_project_url: config.repo?.vercelProjectUrl || null,
    repo_webhook_secret: config.repo?.webhookSecret || null,
    repo_last_deploy_status: config.repo?.lastDeployStatus || null,
    repo_last_deploy_at: config.repo?.lastDeployAt || null,
    repo_last_deploy_error: config.repo?.lastDeployError || null,
    source: config.source || "custom",
    is_active: config.isActive,
    created_at: config.createdAt || new Date().toISOString(),
    updated_at: config.updatedAt || new Date().toISOString(),
  };
}

function normalizeRepoUrl(url: string): string {
  const raw = String(url || '').trim();
  if (!raw) return '';

  // git@github.com:org/repo.git -> https://github.com/org/repo
  if (raw.startsWith('git@')) {
    const parts = raw.replace('git@', '').split(':');
    if (parts.length === 2) {
      return `https://${parts[0]}/${parts[1]}`.replace(/\.git$/i, '').replace(/\/+$/g, '').toLowerCase();
    }
  }

  return raw.replace(/\.git$/i, '').replace(/\/+$/g, '').toLowerCase();
}

async function verifyGithubSignature(payload: string, signatureHeader: string, secret: string): Promise<boolean> {
  try {
    const sigHeader = String(signatureHeader || '').trim().toLowerCase().replace(/\s+/g, '');
    const cleanSecret = String(secret || '').trim();
    if (!sigHeader || !sigHeader.startsWith('sha256=')) return false;
    if (!cleanSecret) return false;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(cleanSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const bytes = new Uint8Array(sig);
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
    const computed = `sha256=${hex}`;
    return computed === sigHeader;
  } catch {
    return false;
  }
}

// ============================================================
// ROTAS
// ============================================================

// ✅ IMPORTANTE: Rota /serve/* DEVE vir ANTES de rotas com parâmetros dinâmicos
// GET /make-server-67caf26a/client-sites/serve/:domain
// Serve o HTML do site baseado no domínio
// Esta rota será chamada quando alguém acessar o domínio do site (ex: medhome.rendizy.app)
app.get("/serve/*", async (c) => {
  console.log(`[CLIENT-SITES] ========== ROTA /serve/* CHAMADA ==========`);
  try {
    // Extrair domínio do header Host ou do path
    const host = c.req.header("Host") || "";
    const path = c.req.path;
    const url = c.req.url;
    const method = c.req.method;

    console.log(`[CLIENT-SITES] Method: ${method}`);
    console.log(`[CLIENT-SITES] Request path: ${path}`);
    console.log(`[CLIENT-SITES] Request URL: ${url}`);
    console.log(`[CLIENT-SITES] Host header: ${host}`);

    // Tentar extrair domínio do Host header primeiro
    let domain = host.split(":")[0]; // Remove porta se houver

    // Se não tiver Host ou for localhost/supabase, tentar extrair do path
    if (
      !domain ||
      domain.includes("localhost") ||
      domain.includes("127.0.0.1") ||
      domain.includes("supabase.co")
    ) {
      // Extrair do path: /serve/medhome.rendizy.app ou /serve/medhome
      // Também funciona com: /make-server-67caf26a/client-sites/serve/medhome.rendizy.app
      const pathParts = path.split("/serve/");
      if (pathParts.length > 1) {
        domain = pathParts[1].split("/")[0].split("?")[0]; // Remove query params
      } else {
        // Tentar extrair do final do path se não encontrar /serve/
        const segments = path.split("/").filter((s) => s);
        const serveIndex = segments.indexOf("serve");
        if (serveIndex >= 0 && serveIndex < segments.length - 1) {
          domain = segments[serveIndex + 1].split("?")[0]; // Remove query params
        }
      }
    }

    // Limpar o domínio (remover espaços, etc)
    domain = domain?.trim() || "";

    console.log(`[CLIENT-SITES] Domínio extraído: ${domain}`);

    if (!domain) {
      return c.html(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Erro - Domínio não especificado</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            h1 { color: #e74c3c; }
            pre { background: #f5f5f5; padding: 20px; border-radius: 5px; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Erro - Domínio não especificado</h1>
          <p>Não foi possível extrair o domínio da requisição.</p>
          <pre>Path: ${path}\nURL: ${url}\nHost: ${host}</pre>
        </body>
        </html>
      `,
        400
      );
    }

    // ✅ CORREÇÃO: Extrair subdomain do domínio completo se necessário
    // Se o domínio for "medhome.rendizy.app", extrair apenas "medhome"
    let subdomain = domain.toLowerCase();
    if (subdomain.includes(".")) {
      // Se contém ponto, pegar apenas a primeira parte (subdomain)
      subdomain = subdomain.split(".")[0];
      console.log(
        `[CLIENT-SITES] Subdomain extraído do domínio completo: ${subdomain}`
      );
    }

    // Buscar site pelo domínio do SQL
    const supabase = getSupabaseClient();

    // Tentar buscar por subdomain primeiro
    let { data: sqlSite, error: sqlError } = await supabase
      .from("client_sites")
      .select("*")
      .ilike("subdomain", subdomain)
      .eq("is_active", true)
      .maybeSingle();

    // Se não encontrar, tentar por domain completo
    if (sqlError || !sqlSite) {
      const { data: sqlSite2 } = await supabase
        .from("client_sites")
        .select("*")
        .ilike("domain", domain.toLowerCase())
        .eq("is_active", true)
        .maybeSingle();

      if (sqlSite2) {
        sqlSite = sqlSite2;
      }
    }

    if (!sqlSite) {
      console.log(
        `[CLIENT-SITES] Site não encontrado para domínio: ${domain} (subdomain tentado: ${subdomain})`
      );
      return c.html(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Site não encontrado</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          </style>
        </head>
        <body>
          <h1>Site não encontrado</h1>
          <p>O site para o domínio <strong>${domain}</strong> não foi encontrado.</p>
        </body>
        </html>
      `,
        404
      );
    }

    const site = sqlToClientSiteConfig(sqlSite);

    console.log(
      `[CLIENT-SITES] Site encontrado: ${site.siteName}, subdomain: ${
        site.subdomain
      }, domain: ${site.domain || "N/A"}, isActive: ${site.isActive}`
    );

    if (!site.isActive) {
      console.log(`[CLIENT-SITES] Site ${site.siteName} está inativo`);
      return c.html(
        `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Site inativo</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          </style>
        </head>
        <body>
          <h1>Site inativo</h1>
          <p>O site <strong>${site.siteName}</strong> está inativo no momento.</p>
        </body>
        </html>
      `,
        403
      );
    }

    console.log(
      `[CLIENT-SITES] Site encontrado: ${site.siteName} (${site.organizationId})`
    );
    console.log(`[CLIENT-SITES] Site tem siteCode: ${!!site.siteCode}`);
    console.log(`[CLIENT-SITES] Site tem archivePath: ${!!site.archivePath}`);

    // Se tiver siteCode, servir diretamente
    if (site.siteCode) {
      console.log(
        `[CLIENT-SITES] Servindo siteCode para ${site.siteName} (tamanho: ${site.siteCode.length} caracteres)`
      );
      // Garantir que o Content-Type está correto
      c.header("Content-Type", "text/html; charset=utf-8");
      return c.html(site.siteCode, 200);
    }

    // Se tiver archivePath, servir arquivo do storage
    if (site.archivePath) {
      console.log(
        `[CLIENT-SITES] Tentando servir arquivo do storage: ${site.archivePath}`
      );

      const bucketName = "client-sites";

      // Tentar baixar o arquivo
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(bucketName)
        .download(site.archivePath);

      if (downloadError || !fileData) {
        console.error(`[CLIENT-SITES] Erro ao baixar arquivo:`, downloadError);
        return c.html(
          `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Erro ao carregar site</title>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              h1 { color: #e74c3c; }
            </style>
          </head>
          <body>
            <h1>Erro ao carregar site</h1>
            <p>O arquivo do site não pôde ser carregado. Por favor, entre em contato com o suporte.</p>
          </body>
          </html>
        `,
          500
        );
      }

      // ✅ EXTRAIR E SERVIR HTML DO ZIP
      try {
        console.log(
          `[CLIENT-SITES] Extraindo HTML do arquivo ZIP: ${site.archivePath}`
        );

        // Converter Blob para ArrayBuffer
        const arrayBuffer = await fileData.arrayBuffer();

        // Detectar se é ZIP ou TAR.GZ
        const isZip = site.archivePath.toLowerCase().endsWith(".zip");
        const isTarGz =
          site.archivePath.toLowerCase().endsWith(".tar.gz") ||
          site.archivePath.toLowerCase().endsWith(".tgz");

        let htmlContent: string | null = null;

        if (isZip) {
          // Extrair ZIP usando JSZip
          console.log(`[CLIENT-SITES] Carregando ZIP...`);
          const zip = await JSZip.loadAsync(arrayBuffer);

          // Listar todos os arquivos para debug
          const allFiles = Object.keys(zip.files);
          console.log(
            `[CLIENT-SITES] Total de arquivos no ZIP: ${allFiles.length}`
          );
          console.log(
            `[CLIENT-SITES] Primeiros 20 arquivos:`,
            allFiles.slice(0, 20)
          );

          // Procurar arquivo HTML principal (index.html, index.htm, ou primeiro .html encontrado)
          // Buscar em todas as pastas, não apenas na raiz
          const htmlFiles = allFiles.filter((name) => {
            const lowerName = name.toLowerCase();
            const isHtml =
              lowerName.endsWith(".html") || lowerName.endsWith(".htm");
            const isNotDir = !zip.files[name].dir;
            return isHtml && isNotDir;
          });

          console.log(
            `[CLIENT-SITES] Arquivos HTML encontrados: ${htmlFiles.length}`
          );
          if (htmlFiles.length > 0) {
            console.log(`[CLIENT-SITES] Lista de HTMLs:`, htmlFiles);
          }

          // Prioridade: dist/index.html > index.html > index.htm > primeiro .html encontrado
          let htmlFile: string | null = null;

          // 1. Buscar dist/index.html (build compilado - melhor opção)
          const distIndexHtml = htmlFiles.find((f) => {
            const lower = f.toLowerCase();
            return lower.includes("dist/") && lower.endsWith("index.html");
          });

          if (distIndexHtml) {
            htmlFile = distIndexHtml;
            console.log(
              `[CLIENT-SITES] ✅ dist/index.html encontrado (build compilado): ${htmlFile}`
            );
          } else {
            // 2. Buscar index.html (em qualquer pasta)
            const indexHtml = htmlFiles.find((f) => {
              const parts = f.toLowerCase().split("/");
              return parts[parts.length - 1] === "index.html";
            });

            if (indexHtml) {
              htmlFile = indexHtml;
              console.log(`[CLIENT-SITES] index.html encontrado: ${htmlFile}`);
            } else {
              // 3. Buscar index.htm
              const indexHtm = htmlFiles.find((f) => {
                const parts = f.toLowerCase().split("/");
                return parts[parts.length - 1] === "index.htm";
              });

              if (indexHtm) {
                htmlFile = indexHtm;
                console.log(`[CLIENT-SITES] index.htm encontrado: ${htmlFile}`);
              } else if (htmlFiles.length > 0) {
                // 4. Pegar o maior arquivo HTML (provavelmente mais completo)
                htmlFile = htmlFiles.reduce((largest, current) => {
                  const largestSize = zip.files[largest]?.uncompressedSize || 0;
                  const currentSize = zip.files[current]?.uncompressedSize || 0;
                  return currentSize > largestSize ? current : largest;
                });
                console.log(
                  `[CLIENT-SITES] Usando maior arquivo HTML encontrado: ${htmlFile}`
                );
              }
            }
          }

          if (htmlFile) {
            console.log(`[CLIENT-SITES] Extraindo arquivo HTML: ${htmlFile}`);
            const file = zip.files[htmlFile];
            if (!file.dir) {
              htmlContent = await file.async("string");
              console.log(`[CLIENT-SITES] ✅ HTML extraído com sucesso!`);
              console.log(
                `[CLIENT-SITES] Tamanho: ${htmlContent.length} caracteres`
              );
              console.log(
                `[CLIENT-SITES] Primeiros 200 caracteres: ${htmlContent.substring(
                  0,
                  200
                )}`
              );

              // Verificar se o HTML parece válido
              if (htmlContent.length < 50) {
                console.warn(
                  `[CLIENT-SITES] ⚠️ HTML muito pequeno, pode estar incompleto`
                );
              }
              if (
                !htmlContent.includes("<html") &&
                !htmlContent.includes("<!DOCTYPE")
              ) {
                console.warn(
                  `[CLIENT-SITES] ⚠️ HTML não parece ter estrutura HTML válida`
                );
              }

              // Se o HTML é do Vite (tem <script type="module">), tentar encontrar assets
              if (
                htmlContent.includes('type="module"') &&
                (htmlContent.includes("/src/") ||
                  htmlContent.includes("main.tsx") ||
                  htmlContent.includes("main.ts"))
              ) {
                console.log(
                  `[CLIENT-SITES] ⚠️ HTML do Vite detectado - precisa de build ou ajustar caminhos`
                );

                // Tentar encontrar diretório dist/ com assets compilados
                const distFiles = allFiles.filter((f) =>
                  f.toLowerCase().includes("dist/")
                );
                if (distFiles.length > 0) {
                  console.log(
                    `[CLIENT-SITES] 📦 Diretório dist/ encontrado com ${distFiles.length} arquivos`
                  );
                  console.log(
                    `[CLIENT-SITES] Primeiros arquivos dist/:`,
                    distFiles.slice(0, 10)
                  );

                  // Tentar encontrar index.html no dist/
                  const distHtml = distFiles.find((f) =>
                    f.toLowerCase().endsWith("index.html")
                  );
                  if (distHtml) {
                    console.log(
                      `[CLIENT-SITES] ✅ Encontrado dist/index.html, usando este!`
                    );
                    const distFile = zip.files[distHtml];
                    if (!distFile.dir) {
                      htmlContent = await distFile.async("string");
                      console.log(
                        `[CLIENT-SITES] ✅ HTML do dist/ extraído: ${htmlContent.length} caracteres`
                      );
                    }
                  }
                } else {
                  console.warn(
                    `[CLIENT-SITES] ⚠️ HTML do Vite sem diretório dist/ - site precisa ser compilado`
                  );
                  console.warn(
                    `[CLIENT-SITES] Arquivos src/ encontrados:`,
                    allFiles
                      .filter((f) => f.toLowerCase().includes("src/"))
                      .slice(0, 10)
                  );

                  // Criar HTML informativo explicando que o site precisa ser compilado
                  htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Site em Construção - ${site.siteName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .container {
      text-align: center;
      max-width: 600px;
      padding: 2rem;
    }
    h1 { font-size: 2.5rem; margin-bottom: 1rem; }
    p { font-size: 1.2rem; line-height: 1.6; opacity: 0.9; }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">🚧</div>
    <h1>Site em Construção</h1>
    <p>O site <strong>${site.siteName}</strong> precisa ser compilado antes de ser publicado.</p>
    <p>Por favor, faça o build do projeto (npm run build) e envie novamente o arquivo ZIP com a pasta <code>dist/</code> incluída.</p>
  </div>
</body>
</html>`;
                  console.log(
                    `[CLIENT-SITES] Servindo HTML informativo (site precisa de build)`
                  );
                }
              }
            } else {
              console.error(
                `[CLIENT-SITES] ❌ Arquivo ${htmlFile} é um diretório, não um arquivo`
              );
            }
          } else {
            console.warn(
              `[CLIENT-SITES] ❌ Nenhum arquivo HTML encontrado no ZIP`
            );
            console.warn(
              `[CLIENT-SITES] Arquivos disponíveis (primeiros 30):`,
              allFiles.slice(0, 30)
            );

            // Tentar encontrar qualquer arquivo que possa ser HTML
            const possibleHtml = allFiles.find((f) => {
              const lower = f.toLowerCase();
              return (
                (lower.includes("html") || lower.includes("htm")) &&
                !zip.files[f].dir
              );
            });

            if (possibleHtml) {
              console.log(
                `[CLIENT-SITES] Tentando usar arquivo possível HTML: ${possibleHtml}`
              );
              const file = zip.files[possibleHtml];
              if (!file.dir) {
                htmlContent = await file.async("string");
                console.log(
                  `[CLIENT-SITES] Conteúdo extraído: ${htmlContent.length} caracteres`
                );
              }
            }
          }
        } else if (isTarGz) {
          // TODO: Implementar extração de TAR.GZ (requer biblioteca adicional)
          console.warn(
            `[CLIENT-SITES] Extração de TAR.GZ ainda não implementada`
          );
        }

        if (htmlContent) {
          console.log(
            `[CLIENT-SITES] HTML extraído com sucesso (${htmlContent.length} caracteres)`
          );

          // ✅ AJUSTAR CAMINHOS NO HTML PARA APONTAR PARA ROTAS DE ASSETS
          // Se for HTML do Vite, ajustar caminhos de /src/ para /assets/
          if (
            htmlContent.includes('type="module"') ||
            htmlContent.includes("/src/") ||
            htmlContent.includes("main.tsx") ||
            htmlContent.includes("main.ts")
          ) {
            console.log(
              `[CLIENT-SITES] Ajustando caminhos do Vite para rotas de assets...`
            );

            // ✅ NOVO: Usar URLs do Storage se arquivos foram extraídos, senão usar Edge Function
            const subdomain = site.subdomain;
            let basePath: string;

            if (site.extractedBaseUrl) {
              // ✅ Usar Storage (Content-Type correto)
              basePath = `${site.extractedBaseUrl}/${site.organizationId}/extracted/dist`;
              console.log(
                `[CLIENT-SITES] ✅ Usando URLs do Storage: ${basePath}`
              );
            } else {
              // ⚠️ Fallback: Edge Function (Content-Type incorreto, mas mantém compatibilidade)
              const backendUrl = `https://odcgnzfremrqnvtitpcc.supabase.co`;
              basePath = `${backendUrl}/functions/v1/rendizy-server/make-server-67caf26a/client-sites/assets/${subdomain}`;
              console.log(
                `[CLIENT-SITES] ⚠️ Usando Edge Function (fallback): ${basePath}`
              );
            }

            // Ajustar /src/ para rota de assets (com URL completa)
            htmlContent = htmlContent.replace(
              /src="\/src\//g,
              `src="${basePath}/src/`
            );
            htmlContent = htmlContent.replace(
              /href="\/src\//g,
              `href="${basePath}/src/`
            );

            // ⚠️ IMPORTANTE: Ajustar /assets/ ANTES do replace genérico
            // Para sites compilados, /assets/ está em dist/assets/ dentro do ZIP
            htmlContent = htmlContent.replace(
              /src="\/assets\//g,
              `src="${basePath}/dist/assets/`
            );
            htmlContent = htmlContent.replace(
              /href="\/assets\//g,
              `href="${basePath}/dist/assets/`
            );

            // Ajustar caminhos absolutos que começam com / (genérico - deve vir DEPOIS dos específicos)
            htmlContent = htmlContent.replace(
              /src="\/([^"]+\.(tsx?|jsx?|css|svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot))"/g,
              (match, filePath) => {
                // Se já começa com http, não ajustar
                if (filePath.startsWith("http")) return match;
                // Se já foi ajustado pelo replace de /assets/, não ajustar novamente
                if (match.includes(`${basePath}`)) return match;
                return `src="${basePath}/${filePath}"`;
              }
            );

            htmlContent = htmlContent.replace(
              /href="\/([^"]+\.(tsx?|jsx?|css|svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot))"/g,
              (match, filePath) => {
                if (filePath.startsWith("http")) return match;
                // Se já foi ajustado pelo replace de /assets/, não ajustar novamente
                if (match.includes(`${basePath}`)) return match;
                return `href="${basePath}/${filePath}"`;
              }
            );
            // Para public e dist (outros casos)
            htmlContent = htmlContent.replace(
              /src="\/(public|dist)\//g,
              `src="${basePath}/$1/`
            );
            htmlContent = htmlContent.replace(
              /href="\/(public|dist)\//g,
              `href="${basePath}/$1/`
            );

            // Ajustar imports em scripts (import statements)
            htmlContent = htmlContent.replace(
              /import\s+['"]\/(src|public|assets|dist)\//g,
              `import "${basePath}/$1/`
            );

            // Ajustar imports relativos também
            htmlContent = htmlContent.replace(
              /import\s+['"]\.\/([^'"]+)['"]/g,
              (match, relPath) => {
                // Manter imports relativos como estão (serão resolvidos pelo navegador)
                return match;
              }
            );

            console.log(`[CLIENT-SITES] ✅ Caminhos ajustados`);
            console.log(
              `[CLIENT-SITES] HTML após ajuste (primeiros 500 chars):`,
              htmlContent.substring(0, 500)
            );
          }

          // ✅ UNIVERSAL: Injetar configuração do RENDIZY no HTML
          // Isso permite que QUALQUER site se conecte automaticamente ao backend
          const supabaseUrl =
            SUPABASE_URL ||
            "https://odcgnzfremrqnvtitpcc.supabase.co";
          const apiBaseUrl = `${supabaseUrl}/functions/v1/rendizy-server/client-sites`;
          const rendizyConfig = {
            API_BASE_URL: apiBaseUrl,
            SUBDOMAIN: site.subdomain,
            ORGANIZATION_ID: site.organizationId,
            SITE_NAME: site.siteName,
          };

          // Injetar script de configuração no <head>
          const configScript = `
    <script>
      // ✅ Configuração automática do RENDIZY (injetada pelo backend)
      // Disponível para TODOS os sites de clientes
      window.RENDIZY_CONFIG = ${JSON.stringify(rendizyConfig, null, 2)};
      
      // ✅ Funções auxiliares para facilitar uso
      window.RENDIZY = {
        // Buscar imóveis da organização
        getProperties: async () => {
          const response = await fetch(
            \`\${window.RENDIZY_CONFIG.API_BASE_URL}/api/\${window.RENDIZY_CONFIG.SUBDOMAIN}/properties\`
          );
          return await response.json();
        }
      };
      
      console.log('✅ RENDIZY Config carregado:', window.RENDIZY_CONFIG);
    </script>`;

          // Injetar antes do </head> ou no início do <body> se não tiver </head>
          if (htmlContent.includes("</head>")) {
            htmlContent = htmlContent.replace(
              "</head>",
              `${configScript}\n</head>`
            );
          } else if (htmlContent.includes("<body")) {
            htmlContent = htmlContent.replace(
              "<body",
              `${configScript}\n<body`
            );
          } else {
            // Se não tiver nem </head> nem <body>, adicionar no início
            htmlContent = configScript + "\n" + htmlContent;
          }

          console.log(
            `[CLIENT-SITES] ✅ Configuração RENDIZY injetada no HTML`
          );
          console.log(
            `[CLIENT-SITES] Subdomain: ${site.subdomain}, Organization: ${site.organizationId}`
          );

          c.header("Content-Type", "text/html; charset=utf-8");
          return c.html(htmlContent, 200);
        } else {
          console.warn(
            `[CLIENT-SITES] Não foi possível extrair HTML do arquivo`
          );
          return c.html(
            `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${site.siteName}</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                h1 { color: #f59e0b; }
          </style>
        </head>
        <body>
          <h1>${site.siteName}</h1>
              <p>Arquivo ZIP recebido, mas nenhum arquivo HTML encontrado.</p>
          <p><small>Arquivo: ${site.archivePath}</small></p>
              <p><small>Verifique se o ZIP contém um arquivo index.html ou similar.</small></p>
        </body>
        </html>
      `,
            200
          );
        }
      } catch (extractError) {
        console.error(
          `[CLIENT-SITES] Erro ao extrair HTML do ZIP:`,
          extractError
        );
        return c.html(
          `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Erro ao processar site</title>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
              h1 { color: #e74c3c; }
            </style>
          </head>
          <body>
            <h1>Erro ao processar site</h1>
            <p>Ocorreu um erro ao extrair o conteúdo do arquivo ZIP.</p>
            <p><small>Arquivo: ${site.archivePath}</small></p>
            <p><small>Erro: ${
              extractError instanceof Error
                ? extractError.message
                : "Erro desconhecido"
            }</small></p>
          </body>
          </html>
        `,
          500
        );
      }
    }

    // Se não tiver siteCode nem archivePath, servir página padrão
    return c.html(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${site.siteName}</title>
        <meta charset="UTF-8">
        <meta name="description" content="${site.siteConfig.description || ""}">
        <style>
          body { 
            font-family: ${site.theme.fontFamily || "Arial, sans-serif"}; 
            margin: 0; 
            padding: 0;
            background: linear-gradient(135deg, ${
              site.theme.primaryColor || "#3B82F6"
            } 0%, ${site.theme.secondaryColor || "#1F2937"} 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            text-align: center;
            padding: 40px;
            max-width: 600px;
          }
          h1 { 
            font-size: 3em; 
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          }
          p { 
            font-size: 1.2em; 
            line-height: 1.6;
            margin-bottom: 30px;
          }
          .contact {
            margin-top: 40px;
            padding-top: 30px;
            border-top: 1px solid rgba(255,255,255,0.3);
          }
          .contact a {
            color: ${site.theme.accentColor || "#10B981"};
            text-decoration: none;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>${site.siteName}</h1>
          <p>${site.siteConfig.description || "Bem-vindo ao nosso site!"}</p>
          ${
            site.siteConfig.slogan
              ? `<p><em>${site.siteConfig.slogan}</em></p>`
              : ""
          }
          <div class="contact">
            ${
              site.siteConfig.contactEmail
                ? `<p>📧 <a href="mailto:${site.siteConfig.contactEmail}">${site.siteConfig.contactEmail}</a></p>`
                : ""
            }
            ${
              site.siteConfig.contactPhone
                ? `<p>📞 <a href="tel:${site.siteConfig.contactPhone}">${site.siteConfig.contactPhone}</a></p>`
                : ""
            }
          </div>
          <p><small>Site em construção. Em breve, conteúdo completo estará disponível.</small></p>
        </div>
      </body>
      </html>
    `,
      200
    );
  } catch (error) {
    console.error("[CLIENT-SITES] Erro ao servir site:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "";
    return c.html(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Erro</title>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          h1 { color: #e74c3c; }
          pre { background: #f5f5f5; padding: 20px; border-radius: 5px; text-align: left; margin: 20px auto; max-width: 800px; }
        </style>
      </head>
      <body>
        <h1>Erro ao carregar site</h1>
        <p>Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.</p>
        <details style="margin-top: 20px;">
          <summary style="cursor: pointer; color: #3498db;">Ver detalhes do erro</summary>
          <pre>Erro: ${errorMessage}
${errorStack ? `Stack: ${errorStack}` : ""}</pre>
        </details>
      </body>
      </html>
    `,
      500
    );
  }
});

// GET /make-server-67caf26a/client-sites
// Lista todos os sites ou busca por organizationId
app.get("/", async (c) => {
  try {
    const auth = await requireSqlAuth(c);
    if (auth instanceof Response) return auth;

    const supabase = getSupabaseClient();

    // ✅ CORRIGIDO: Verificar query param primeiro antes de usar getOrganizationIdOrThrow
    // Se houver organization_id no query, usar ele. Se não, listar todos os sites.
    const orgIdFromQuery = c.req.query("organization_id");

    if (orgIdFromQuery) {
      console.log(
        `[CLIENT-SITES] Buscando site para organization_id do query: ${orgIdFromQuery}`
      );

      if (!auth.isSuperAdmin && auth.organizationId !== orgIdFromQuery) {
        return c.json(
          { success: false, error: "Acesso negado para esta organização" },
          403
        );
      }

      // Buscar site específico do SQL
      const { data: sqlSite, error: sqlError } = await supabase
        .from("client_sites")
        .select("*")
        .eq("organization_id", orgIdFromQuery)
        .maybeSingle();

      if (sqlError || !sqlSite) {
        return c.json(
          {
            success: false,
            error: "Site não encontrado para esta organização",
          },
          404
        );
      }

      const site = sqlToClientSiteConfig(sqlSite);
      return c.json({ success: true, data: site });
    }

    // ✅ Se não há organization_id no query:
    // - Superadmin pode listar tudo
    // - Usuário normal lista apenas o próprio site
    const query = supabase
      .from("client_sites")
      .select("*")
      .order("created_at", { ascending: false });

    if (!auth.isSuperAdmin) {
      if (!auth.organizationId) {
        return c.json({ success: false, error: "Usuário sem organization_id" }, 403);
      }
      query.eq("organization_id", auth.organizationId);
    } else {
      console.log(
        `[CLIENT-SITES] Superadmin - listando todos os sites (sem filtro de organization_id)`
      );
    }

    const { data: sqlSites, error: sqlError } = await query;

    if (sqlError) {
      throw sqlError;
    }

    const sites = (sqlSites || []).map(sqlToClientSiteConfig);

    console.log(`[CLIENT-SITES] ✅ ${sites.length} sites encontrados`);

    return c.json({
      success: true,
      data: sites,
      count: sites.length,
    });
  } catch (error) {
    console.error("[CLIENT-SITES] Erro ao buscar sites:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      500
    );
  }
});

// POST /make-server-67caf26a/client-sites
// Criar novo site para cliente
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const {
      organizationId,
      siteName,
      template,
      domain,
      theme,
      siteConfig,
      features,
    } = body;

    const auth = await requireOrganizationAccess(c, organizationId);
    if (auth instanceof Response) return auth;

    // Validações
    if (!organizationId) {
      return c.json(
        {
          success: false,
          error: "organizationId é obrigatório",
        },
        400
      );
    }

    if (!siteName) {
      return c.json(
        {
          success: false,
          error: "siteName é obrigatório",
        },
        400
      );
    }

    const supabase = getSupabaseClient();

    // Verificar se já existe site para esta organização no SQL
    const { data: existing } = await supabase
      .from("client_sites")
      .select("id")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (existing) {
      return c.json(
        {
          success: false,
          error:
            "Organização já possui um site configurado. Use PUT para atualizar.",
        },
        409
      );
    }

    // Gerar subdomínio automático
    const subdomain = generateSubdomain(siteName);

    // Criar configuração do site
    const siteData: ClientSiteConfig = {
      organizationId,
      siteName,
      template: template || "custom",
      subdomain,
      domain: domain || undefined,
      theme: theme || {
        primaryColor: "#3B82F6",
        secondaryColor: "#1F2937",
        accentColor: "#10B981",
        fontFamily: "Inter, sans-serif",
      },
      siteConfig: siteConfig || {
        title: siteName,
        description: `Site oficial de ${siteName}`,
        contactEmail: "",
        contactPhone: "",
      },
      features: features || {
        shortTerm: true,
        longTerm: false,
        sale: false,
      },
      source: body.source || "custom",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
    };

    // Salvar no SQL
    const sqlData = clientSiteConfigToSql(siteData);
    const { data: insertedSite, error: insertError } = await supabase
      .from("client_sites")
      .insert(sqlData)
      .select()
      .single();

    if (insertError) {
      console.error("[CLIENT-SITES] Erro ao criar site no SQL:", insertError);
      throw insertError;
    }

    const createdSite = sqlToClientSiteConfig(insertedSite);

    console.log(
      `[CLIENT-SITES] Site criado no SQL para ${organizationId}:`,
      subdomain
    );

    return c.json(
      {
        success: true,
        data: createdSite,
        message: `Site criado com sucesso! Acesse em: ${subdomain}.rendizy.app`,
      },
      201
    );
  } catch (error) {
    console.error("[CLIENT-SITES] Erro ao criar site:", error);
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

// PUT /make-server-67caf26a/client-sites/:organizationId
// Atualizar configurações do site
app.put("/:organizationId", async (c) => {
  try {
    const { organizationId } = c.req.param();
    const updates = await c.req.json();

    const auth = await requireOrganizationAccess(c, organizationId);
    if (auth instanceof Response) return auth;

    const supabase = getSupabaseClient();

    // Buscar site existente do SQL
    const { data: existing, error: fetchError } = await supabase
      .from("client_sites")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (fetchError || !existing) {
      return c.json(
        {
          success: false,
          error: "Site não encontrado",
        },
        404
      );
    }

    // Atualizar dados
    const existingConfig = sqlToClientSiteConfig(existing);
    const updated: ClientSiteConfig = {
      ...existingConfig,
      ...updates,
      organizationId, // Garantir que não seja alterado
      updatedAt: new Date().toISOString(),
    };

    // Salvar no SQL
    const sqlData = clientSiteConfigToSql(updated);
    const { error: updateError } = await supabase
      .from("client_sites")
      .update(sqlData)
      .eq("organization_id", organizationId);

    if (updateError) {
      throw updateError;
    }

    console.log(`[CLIENT-SITES] Site atualizado:`, organizationId);

    return c.json({
      success: true,
      data: updated,
      message: "Site atualizado com sucesso!",
    });
  } catch (error) {
    console.error("[CLIENT-SITES] Erro ao atualizar site:", error);
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

// POST /make-server-67caf26a/client-sites/:organizationId/repo/deploy
// Dispara deploy via Vercel Deploy Hook do repositório
app.post("/:organizationId/repo/deploy", async (c) => {
  try {
    const { organizationId } = c.req.param();

    const auth = await requireOrganizationAccess(c, organizationId);
    if (auth instanceof Response) return auth;

    const supabase = getSupabaseClient();

    const { data: existing, error: fetchError } = await supabase
      .from("client_sites")
      .select("id, repo_deploy_hook_url")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (fetchError || !existing) {
      return c.json(
        {
          success: false,
          error: "Site não encontrado",
        },
        404
      );
    }

    const hookUrl = existing.repo_deploy_hook_url || "";
    if (!hookUrl) {
      return c.json(
        {
          success: false,
          error: "Deploy hook não configurado",
        },
        400
      );
    }

    const now = new Date().toISOString();
    const hookResponse = await fetch(hookUrl, { method: "POST" });
    if (!hookResponse.ok) {
      const errText = await hookResponse.text().catch(() => "");
      await supabase
        .from("client_sites")
        .update({
          repo_last_deploy_status: "error",
          repo_last_deploy_at: now,
          repo_last_deploy_error: errText || `HTTP ${hookResponse.status}`,
          updated_at: now,
        })
        .eq("organization_id", organizationId);

      return c.json(
        {
          success: false,
          error: "Falha ao disparar deploy",
          details: errText || `HTTP ${hookResponse.status}`,
        },
        502
      );
    }

    await supabase
      .from("client_sites")
      .update({
        repo_last_deploy_status: "triggered",
        repo_last_deploy_at: now,
        repo_last_deploy_error: null,
        updated_at: now,
      })
      .eq("organization_id", organizationId);

    return c.json({
      success: true,
      message: "Deploy disparado com sucesso",
      deployedAt: now,
    });
  } catch (error) {
    console.error("[CLIENT-SITES] Erro ao disparar deploy:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      500
    );
  }
});

// POST /make-server-67caf26a/client-sites/repo/webhook/github
// Webhook do GitHub: dispara deploy via Vercel Deploy Hook
// IA NOTE:
// - Este endpoint precisa ficar sem JWT (config em supabase/config.toml).
// - A assinatura HMAC deve usar o BODY BRUTO (c.req.text()).
// - Não parsear JSON antes de validar a assinatura.
app.post("/repo/webhook/github", async (c) => {
  try {
    if (!GITHUB_WEBHOOK_SECRET) {
      return c.json({ success: false, error: "GITHUB_WEBHOOK_SECRET não configurado" }, 500);
    }

    const signature = c.req.header("x-hub-signature-256") || "";
    const event = c.req.header("x-github-event") || "";
    const payloadText = await c.req.text();
    let payload: any = null;

    try {
      payload = JSON.parse(payloadText);
    } catch {
      return c.json({ success: false, error: "Payload inválido" }, 400);
    }

    const repoUrl = payload?.repository?.html_url || payload?.repository?.clone_url || '';
    const ref = String(payload?.ref || '');
    const branch = ref.startsWith('refs/heads/') ? ref.replace('refs/heads/', '') : ref;
    const normalized = normalizeRepoUrl(repoUrl);

    if (!normalized) {
      return c.json({ success: false, error: "Repo URL ausente" }, 400);
    }

    const supabase = await getSupabaseClient(c, { useServiceRole: true });
    const { data: sites, error: sitesError } = await supabase
      .from("client_sites")
      .select("organization_id, repo_url, repo_branch, repo_deploy_hook_url, repo_webhook_secret")
      .not("repo_url", "is", null);

    if (sitesError) {
      throw sitesError;
    }

    const match = (sites || []).find((s: any) => {
      const sUrl = normalizeRepoUrl(s.repo_url || '');
      if (!sUrl || sUrl !== normalized) return false;
      if (s.repo_branch && branch && String(s.repo_branch) !== String(branch)) return false;
      return true;
    });

    const secretToUse = match?.repo_webhook_secret || GITHUB_WEBHOOK_SECRET;
    const valid = await verifyGithubSignature(payloadText, signature, secretToUse);
    if (!valid) {
      const debug = c.req.header("x-rendizy-debug") === "1";
      if (debug) {
        // Retorna apenas dados de comparação (sem expor segredo)
        const sigHeader = String(signature || '').trim().toLowerCase();
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(String(secretToUse || '').trim()),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadText));
        const bytes = new Uint8Array(sig);
        const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
        const computed = `sha256=${hex}`;
        return c.json({
          success: false,
          error: "Assinatura inválida",
          debug: {
            signatureHeader: sigHeader,
            computed,
            secretSource: match?.repo_webhook_secret ? 'site' : 'global',
          }
        }, 401);
      }
      return c.json({ success: false, error: "Assinatura inválida" }, 401);
    }

    if (event !== 'push') {
      return c.json({ success: true, ignored: true, reason: "Evento não suportado" });
    }

    if (!match) {
      return c.json({ success: false, error: "Site não encontrado para este repo/branch" }, 404);
    }

    if (!match.repo_deploy_hook_url) {
      return c.json({ success: false, error: "Deploy hook não configurado" }, 400);
    }

    const now = new Date().toISOString();
    const hookResponse = await fetch(match.repo_deploy_hook_url, { method: 'POST' });
    if (!hookResponse.ok) {
      const errText = await hookResponse.text().catch(() => "");
      await supabase
        .from("client_sites")
        .update({
          repo_last_deploy_status: "error",
          repo_last_deploy_at: now,
          repo_last_deploy_error: errText || `HTTP ${hookResponse.status}`,
          updated_at: now,
        })
        .eq("organization_id", match.organization_id);

      return c.json(
        {
          success: false,
          error: "Falha ao disparar deploy",
          details: errText || `HTTP ${hookResponse.status}`,
        },
        502
      );
    }

    await supabase
      .from("client_sites")
      .update({
        repo_last_deploy_status: "triggered",
        repo_last_deploy_at: now,
        repo_last_deploy_error: null,
        updated_at: now,
      })
      .eq("organization_id", match.organization_id);

    return c.json({
      success: true,
      message: "Deploy disparado",
      organizationId: match.organization_id,
      branch,
      repoUrl: normalized,
    });
  } catch (error) {
    console.error("[CLIENT-SITES] Erro no webhook GitHub:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      500
    );
  }
});

// POST /make-server-67caf26a/client-sites/:organizationId/upload-code
// Upload do código do site (importado de v0.dev, Bolt, Figma, etc)
app.post("/:organizationId/upload-code", async (c) => {
  try {
    const { organizationId } = c.req.param();
    const { siteCode } = await c.req.json();

    const auth = await requireOrganizationAccess(c, organizationId);
    if (auth instanceof Response) return auth;

    if (!siteCode) {
      return c.json(
        {
          success: false,
          error: "siteCode é obrigatório",
        },
        400
      );
    }

    const supabase = getSupabaseClient();

    // Buscar site existente do SQL
    const { data: existing, error: fetchError } = await supabase
      .from("client_sites")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (fetchError || !existing) {
      return c.json(
        {
          success: false,
          error: "Site não encontrado. Crie o site primeiro.",
        },
        404
      );
    }

    // Atualizar com o código
    const existingConfig = sqlToClientSiteConfig(existing);
    const updated: ClientSiteConfig = {
      ...existingConfig,
      siteCode,
      template: "custom", // Marcar como customizado
      updatedAt: new Date().toISOString(),
    };

    // Salvar no SQL
    const sqlData = clientSiteConfigToSql(updated);
    const { error: updateError } = await supabase
      .from("client_sites")
      .update(sqlData)
      .eq("organization_id", organizationId);

    if (updateError) {
      throw updateError;
    }

    console.log(`[CLIENT-SITES] Código do site atualizado:`, organizationId);

    return c.json({
      success: true,
      data: updated,
      message: "Código do site enviado com sucesso!",
    });
  } catch (error) {
    console.error("[CLIENT-SITES] Erro ao fazer upload do código:", error);
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

// POST /make-server-67caf26a/client-sites/:organizationId/upload-archive
// Upload de arquivo (ZIP/TAR) com o projeto completo do site (Bolt, v0, etc)
app.post("/:organizationId/upload-archive", async (c) => {
  try {
    const { organizationId } = c.req.param();

    const auth = await requireOrganizationAccess(c, organizationId);
    if (auth instanceof Response) return auth;

    const supabase = getSupabaseClient();

    // Garantir que o site já exista no SQL
    const { data: existing, error: fetchError } = await supabase
      .from("client_sites")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (fetchError || !existing) {
      return c.json(
        {
          success: false,
          error: "Site não encontrado. Crie o site primeiro.",
        },
        404
      );
    }

    const existingConfig = sqlToClientSiteConfig(existing);

    // Ler multipart/form-data
    const formData = await c.req.formData();
    const file = formData.get("file");
    const source =
      (formData.get("source") as string | null) ||
      existingConfig.source ||
      "custom";

    if (!file || !(file instanceof File)) {
      return c.json(
        {
          success: false,
          error:
            'Arquivo não enviado. Use o campo "file" com um .zip ou .tar.gz',
        },
        400
      );
    }

    // ✅ VALIDAÇÃO: Aceitar APENAS arquivos ZIP
    const originalName = file.name || "site.zip";
    const lowerName = originalName.toLowerCase();
    const isZip = lowerName.endsWith(".zip");

    if (!isZip) {
      return c.json(
        {
          success: false,
          error:
            "Formato de arquivo não suportado. Envie APENAS um arquivo .zip com a pasta dist/ compilada.",
        },
        400
      );
    }

    // Nome do bucket para armazenar sites de clientes
    const bucketName = "client-sites";

    // Garantir bucket PUBLICO (necessário para servir via /storage/v1/object/public/...)
    // - Se não existir: cria como público
    // - Se existir: tenta atualizar para público
    try {
      await supabase.storage.createBucket(bucketName, { public: true });
    } catch (_err) {
      // ignore
    }
    try {
      await supabase.storage.updateBucket(bucketName, { public: true });
    } catch (_err) {
      // ignore
    }

    // ✅ ETAPA 1: Validar ZIP antes de fazer upload
    console.log("[CLIENT-SITES] 📦 Etapa 1: Abrindo ZIP para validação...");

    const arrayBuffer = await file.arrayBuffer();
    let zip: JSZip;

    try {
      zip = await JSZip.loadAsync(arrayBuffer);
      console.log("[CLIENT-SITES] ✅ ZIP aberto com sucesso");
    } catch (error) {
      console.error("[CLIENT-SITES] ❌ Erro ao abrir ZIP:", error);
      return c.json(
        {
          success: false,
          error:
            "Arquivo ZIP inválido ou corrompido. Verifique o arquivo e tente novamente.",
        },
        400
      );
    }

    // ✅ ETAPA 2: Validar pasta dist/ obrigatória
    console.log("[CLIENT-SITES] 📋 Etapa 2: Conferindo arquivos...");
    const allFiles = Object.keys(zip.files);
    const distFiles = allFiles.filter((f) => {
      const lower = f.toLowerCase();
      return lower.includes("dist/") && !zip.files[f].dir;
    });

    if (distFiles.length === 0) {
      console.error("[CLIENT-SITES] ❌ Pasta dist/ não encontrada no ZIP");
      return c.json(
        {
          success: false,
          error:
            'Pasta dist/ não encontrada no ZIP. O site precisa ser compilado antes do upload. Peça ao Bolt: "Compile este site para produção" ou execute npm run build manualmente.',
          validation: {
            step: "dist_validation",
            hasDist: false,
            totalFiles: allFiles.length,
          },
        },
        400
      );
    }

    console.log(
      `[CLIENT-SITES] ✅ Pasta dist/ encontrada com ${distFiles.length} arquivos`
    );

    // ✅ ETAPA 3: Validar arquivos necessários
    const distIndexHtml = distFiles.find((f) => {
      const lower = f.toLowerCase();
      return lower.endsWith("index.html") && lower.includes("dist/");
    });

    if (!distIndexHtml) {
      console.error("[CLIENT-SITES] ❌ dist/index.html não encontrado");
      return c.json(
        {
          success: false,
          error:
            "Arquivo dist/index.html não encontrado. O site compilado precisa ter um index.html na pasta dist/.",
          validation: {
            step: "index_html_validation",
            hasDist: true,
            hasIndexHtml: false,
            distFiles: distFiles.slice(0, 10),
          },
        },
        400
      );
    }

    // Validar que tem pelo menos um arquivo JS e CSS (assets)
    const jsFiles = distFiles.filter((f) => {
      const lower = f.toLowerCase();
      return lower.endsWith(".js") || lower.endsWith(".mjs");
    });
    const cssFiles = distFiles.filter((f) => {
      const lower = f.toLowerCase();
      return lower.endsWith(".css");
    });

    if (jsFiles.length === 0) {
      console.warn(
        "[CLIENT-SITES] ⚠️ Nenhum arquivo JavaScript encontrado em dist/"
      );
    }
    if (cssFiles.length === 0) {
      console.warn("[CLIENT-SITES] ⚠️ Nenhum arquivo CSS encontrado em dist/");
    }

    console.log(
      `[CLIENT-SITES] ✅ Arquivos validados: ${distFiles.length} arquivos em dist/, ${jsFiles.length} JS, ${cssFiles.length} CSS`
    );

    // ✅ ETAPA 4: Upload para o Supabase Storage
    console.log("[CLIENT-SITES] 📤 Etapa 3: Fazendo upload do arquivo...");
    const timestamp = Date.now();
    const objectPath = `${organizationId}/${timestamp}-${originalName.replace(
      /[^a-zA-Z0-9.\-_]/g,
      "_"
    )}.zip`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(objectPath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error(
        "[CLIENT-SITES] Erro ao fazer upload do arquivo:",
        uploadError
      );
      return c.json(
        {
          success: false,
          error: "Erro ao armazenar arquivo do site",
        },
        500
      );
    }

    console.log("[CLIENT-SITES] ✅ Upload do ZIP concluído com sucesso");

    // ✅ NOVA ETAPA: Extrair e fazer upload de todos os arquivos para Storage
    console.log("[CLIENT-SITES] 📦 Etapa 4: Extraindo arquivos do ZIP...");

    const extractedFiles: string[] = []; // Caminhos dos arquivos extraídos
    const supabaseUrl =
      SUPABASE_URL ||
      "https://odcgnzfremrqnvtitpcc.supabase.co";
    const publicBaseUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}`;

    // Função para determinar Content-Type baseado na extensão
    const getContentType = (filePath: string): string => {
      const ext = filePath.split(".").pop()?.toLowerCase() || "";
      const contentTypes: Record<string, string> = {
        js: "application/javascript",
        mjs: "application/javascript",
        css: "text/css",
        html: "text/html",
        htm: "text/html",
        json: "application/json",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        gif: "image/gif",
        svg: "image/svg+xml",
        webp: "image/webp",
        ico: "image/x-icon",
        woff: "font/woff",
        woff2: "font/woff2",
        ttf: "font/ttf",
      };
      return contentTypes[ext] || "application/octet-stream";
    };

    // Extrair todos os arquivos do ZIP e fazer upload
    let uploadedCount = 0;
    let skippedCount = 0;

    const isSafePath = (p: string): boolean => {
      if (!p) return false;
      // Normalizar separadores
      const path = p.replace(/\\/g, "/");
      // Bloquear NUL, paths absolutos e drive letters
      if (path.includes("\u0000")) return false;
      if (path.startsWith("/")) return false;
      if (/^[a-zA-Z]:\//.test(path)) return false;
      // Bloquear traversal
      const parts = path.split("/").filter(Boolean);
      if (parts.some((seg) => seg === ".." || seg === ".")) return false;
      return true;
    };

    const MAX_EXTRACTED_FILES = 2000;

    for (const [zipPathRaw, zipFile] of Object.entries(zip.files)) {
      const zipPath = (zipPathRaw || "").replace(/\\/g, "/");

      // Ignorar diretórios e arquivos ocultos
      if (
        zipFile.dir ||
        zipPath.startsWith(".") ||
        zipPath.includes("__MACOSX")
      ) {
        continue;
      }

      // Segurança: recusar paths suspeitos no ZIP
      if (!isSafePath(zipPath)) {
        skippedCount++;
        continue;
      }

      // Normalizar caminho (remover prefixos de pasta raiz do projeto)
      let normalizedPath = zipPath;

      // Remover prefixos comuns como "project-bolt-.../project/" ou "project/"
      const pathParts = zipPath.split("/");
      const distIndex = pathParts.findIndex((p) => p.toLowerCase() === "dist");

      if (distIndex >= 0) {
        // Se encontrou "dist", usar tudo a partir de "dist"
        normalizedPath = pathParts.slice(distIndex).join("/");
      } else {
        // Caso contrário, remover primeiro nível se for pasta do projeto
        if (pathParts.length > 1 && pathParts[0].includes("project")) {
          normalizedPath = pathParts.slice(1).join("/");
        }
      }

      // ✅ Segurança + consistência: só extrair arquivos do dist/
      // (evita expor src/, configs, etc)
      const normalizedLower = normalizedPath.toLowerCase();
      if (!normalizedLower.startsWith("dist/")) {
        skippedCount++;
        continue;
      }

      // Segurança: bloquear traversal também depois da normalização
      if (!isSafePath(normalizedPath)) {
        skippedCount++;
        continue;
      }

      // Segurança: não publicar sourcemaps (evita expor código fonte)
      if (normalizedLower.endsWith(".map")) {
        skippedCount++;
        continue;
      }

      // Anti-DoS: limite de arquivos extraídos
      if (uploadedCount >= MAX_EXTRACTED_FILES) {
        console.warn(
          `[CLIENT-SITES] ⚠️ Limite de extração atingido (${MAX_EXTRACTED_FILES}). Ignorando o restante.`
        );
        break;
      }

      const storagePath = `${organizationId}/extracted/${normalizedPath}`;

      try {
        // Ler conteúdo do arquivo
        const content = await zipFile.async("arraybuffer");
        const contentType = getContentType(normalizedPath);

        // Fazer upload para Storage
        const { error: fileUploadError } = await supabase.storage
          .from(bucketName)
          .upload(storagePath, content, {
            contentType,
            cacheControl: "public, max-age=31536000", // 1 ano de cache
            upsert: true, // Sobrescrever se existir
          });

        if (fileUploadError) {
          console.warn(
            `[CLIENT-SITES] ⚠️ Erro ao fazer upload de ${storagePath}:`,
            fileUploadError
          );
          skippedCount++;
        } else {
          extractedFiles.push(storagePath);
          uploadedCount++;

          if (uploadedCount % 10 === 0) {
            console.log(
              `[CLIENT-SITES] 📤 ${uploadedCount} arquivos extraídos...`
            );
          }
        }
      } catch (error) {
        console.warn(`[CLIENT-SITES] ⚠️ Erro ao processar ${zipPath}:`, error);
        skippedCount++;
      }
    }

    console.log(
      `[CLIENT-SITES] ✅ Extração concluída: ${uploadedCount} arquivos extraídos, ${skippedCount} ignorados`
    );

    // Gerar URL assinada para uso futuro (deploy, inspeção, etc.)
    const { data: signedUrlData, error: signedUrlError } =
      await supabase.storage
        .from(bucketName)
        .createSignedUrl(objectPath, 60 * 60 * 24 * 7); // 7 dias

    let archiveUrl: string | undefined = undefined;
    if (!signedUrlError && signedUrlData?.signedUrl) {
      archiveUrl = signedUrlData.signedUrl;
    }

    // Atualizar config do site com path/URL do arquivo no SQL
    const updated: ClientSiteConfig = {
      ...existingConfig,
      source: source as ClientSiteConfig["source"],
      archivePath: objectPath,
      archiveUrl: archiveUrl || existingConfig.archiveUrl,
      // ✅ NOVO: Salvar base URL para arquivos extraídos
      extractedBaseUrl: publicBaseUrl,
      extractedFilesCount: uploadedCount,
      updatedAt: new Date().toISOString(),
    };

    const sqlData = clientSiteConfigToSql(updated);
    const { error: updateError } = await supabase
      .from("client_sites")
      .update(sqlData)
      .eq("organization_id", organizationId);

    if (updateError) {
      throw updateError;
    }

    console.log(`[CLIENT-SITES] Arquivo do site armazenado:`, {
      organizationId,
      objectPath,
      source,
    });

    return c.json({
      success: true,
      data: {
        archivePath: objectPath,
        archiveUrl,
        extractedBaseUrl: publicBaseUrl,
        extractedFilesCount: uploadedCount,
        source,
        validation: {
          hasDist: true,
          hasIndexHtml: true,
          distFilesCount: distFiles.length,
          jsFilesCount: jsFiles.length,
          cssFilesCount: cssFiles.length,
          totalFiles: allFiles.length,
        },
      },
      message:
        uploadedCount > 0
          ? `✅ ${uploadedCount} arquivos extraídos e prontos para servir!`
          : "Arquivo validado e enviado com sucesso! O site está pronto para uso.",
      steps: [
        { step: 1, name: "Abrindo ZIP", status: "completed" },
        { step: 2, name: "Conferindo arquivos", status: "completed" },
        { step: 3, name: "Arquivos corretos", status: "completed" },
        {
          step: 4,
          name: "Extraindo arquivos",
          status: uploadedCount > 0 ? "completed" : "skipped",
        },
        { step: 5, name: "Concluído", status: "completed" },
      ],
    });
  } catch (error) {
    console.error(
      "[CLIENT-SITES] Erro ao fazer upload do arquivo do site:",
      error
    );
    return c.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao enviar arquivo do site",
      },
      500
    );
  }
});

// POST /make-server-67caf26a/client-sites/:organizationId/upload-archive-from-url
// Faz o download de um arquivo .zip ou .tar.gz remoto (ex: Google Drive, S3, etc)
// e armazena no bucket "client-sites", associando ao site do cliente
app.post("/:organizationId/upload-archive-from-url", async (c) => {
  try {
    const { organizationId } = c.req.param();

    const auth = await requireOrganizationAccess(c, organizationId);
    if (auth instanceof Response) return auth;

    // 🔒 Segurança: este endpoint pode ser usado para SSRF.
    // Mantemos DESABILITADO por padrão e, quando habilitado, exigimos superadmin.
    const enabled = (Deno.env.get("ENABLE_CLIENT_SITES_ARCHIVE_FROM_URL") || "").toLowerCase() === "true";
    if (!enabled) {
      return c.json(
        {
          success: false,
          error: "Endpoint desabilitado por segurança",
        },
        403
      );
    }
    if (!auth.isSuperAdmin) {
      return c.json({ success: false, error: "Acesso negado" }, 403);
    }

    const body = await c.req.json();
    const url = (body?.url as string | undefined)?.trim();
    const source = (body?.source as string | undefined) || "custom";

    if (!url) {
      return c.json(
        {
          success: false,
          error: "URL é obrigatória",
        },
        400
      );
    }

    const supabase = getSupabaseClient();

    // Garantir que o site já exista no SQL
    const { data: existing, error: fetchError } = await supabase
      .from("client_sites")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (fetchError || !existing) {
      return c.json(
        {
          success: false,
          error: "Site não encontrado. Crie o site primeiro.",
        },
        404
      );
    }

    const existingConfig = sqlToClientSiteConfig(existing);

    const lowerUrl = url.toLowerCase();
    const isZip = lowerUrl.includes(".zip");
    const isTarGz = lowerUrl.includes(".tar.gz") || lowerUrl.includes(".tgz");

    if (!isZip && !isTarGz) {
      console.warn(
        "[CLIENT-SITES] URL não parece apontar para .zip ou .tar.gz:",
        url
      );
      return c.json(
        {
          success: false,
          error: "A URL deve apontar para um arquivo .zip ou .tar.gz",
        },
        400
      );
    }

    console.log("[CLIENT-SITES] Baixando arquivo remoto para site:", {
      organizationId,
      url,
      source,
    });

    // Validar URL (mínimo): apenas https
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return c.json({ success: false, error: "URL inválida" }, 400);
    }
    if (parsedUrl.protocol !== "https:") {
      return c.json({ success: false, error: "Somente URLs https são permitidas" }, 400);
    }

    const fetchResponse = await fetch(parsedUrl.toString());

    if (!fetchResponse.ok) {
      console.error(
        "[CLIENT-SITES] Erro ao baixar arquivo remoto:",
        fetchResponse.status,
        fetchResponse.statusText
      );
      return c.json(
        {
          success: false,
          error: `Erro ao baixar arquivo remoto (${fetchResponse.status} - ${fetchResponse.statusText})`,
        },
        502
      );
    }

    // Anti-DoS: limite por content-length (quando disponível)
    const contentLengthHeader = fetchResponse.headers.get("content-length");
    if (contentLengthHeader) {
      const size = Number(contentLengthHeader);
      const max = 50 * 1024 * 1024; // 50MB
      if (Number.isFinite(size) && size > max) {
        return c.json(
          { success: false, error: "Arquivo remoto muito grande" },
          413
        );
      }
    }

    const arrayBuffer = await fetchResponse.arrayBuffer();
    const fileBytes = new Uint8Array(arrayBuffer);

    const bucketName = "client-sites";

    // Tentar criar o bucket caso ainda não exista (ignorar erro de já existente)
    try {
      await supabase.storage.createBucket(bucketName, {
        public: false,
      });
    } catch (_err) {
      // Se já existir, ignoramos
    }

    const timestamp = Date.now();
    const ext = isTarGz ? ".tar.gz" : ".zip";
    const objectPath = `${organizationId}/${timestamp}-remote${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(objectPath, fileBytes, {
        cacheControl: "3600",
        upsert: false,
        contentType: "application/octet-stream",
      });

    if (uploadError) {
      console.error(
        "[CLIENT-SITES] Erro ao fazer upload do arquivo remoto:",
        uploadError
      );
      return c.json(
        {
          success: false,
          error: "Erro ao armazenar arquivo remoto do site",
        },
        500
      );
    }

    const { data: signedUrlData, error: signedUrlError } =
      await supabase.storage
        .from(bucketName)
        .createSignedUrl(objectPath, 60 * 60 * 24 * 7); // 7 dias

    let archiveUrl: string | undefined = existing.archiveUrl;
    if (!signedUrlError && signedUrlData?.signedUrl) {
      archiveUrl = signedUrlData.signedUrl;
    }

    const updated: ClientSiteConfig = {
      ...existingConfig,
      source: source as ClientSiteConfig["source"],
      archivePath: objectPath,
      archiveUrl,
      updatedAt: new Date().toISOString(),
    };

    const sqlData = clientSiteConfigToSql(updated);
    const { error: updateError } = await supabase
      .from("client_sites")
      .update(sqlData)
      .eq("organization_id", organizationId);

    if (updateError) {
      throw updateError;
    }

    console.log("[CLIENT-SITES] Arquivo remoto associado ao site:", {
      organizationId,
      objectPath,
      url,
      source,
    });

    return c.json({
      success: true,
      data: {
        archivePath: objectPath,
        archiveUrl,
        source,
      },
      message: "Arquivo remoto do site baixado e associado com sucesso!",
    });
  } catch (error) {
    console.error(
      "[CLIENT-SITES] Erro ao processar upload-archive-from-url:",
      error
    );
    return c.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erro desconhecido ao processar URL remota",
      },
      500
    );
  }
});

// GET /make-server-67caf26a/client-sites/by-subdomain/:subdomain
// Buscar site por subdomain (para visualização pública em localhost/produção)
app.get("/by-subdomain/:subdomain", async (c) => {
  try {
    const auth = await requireSqlAuth(c);
    if (auth instanceof Response) return auth;

    const subdomain = c.req.param("subdomain");

    console.log(`[CLIENT-SITES] Buscando site por subdomain: ${subdomain}`);

    if (!subdomain) {
      return c.json(
        {
          success: false,
          error: "Subdomain é obrigatório",
        },
        400
      );
    }

    // Buscar site por subdomain do SQL
    const supabase = getSupabaseClient();
    const cleanSubdomain = subdomain.replace(".rendizy.app", "").toLowerCase();

    // Tentar buscar da tabela client_sites (se existir)
    let site: any = null;

    try {
      // Buscar por subdomain primeiro
      let { data: sqlSite, error: sqlError } = await supabase
        .from("client_sites")
        .select("*")
        .ilike("subdomain", cleanSubdomain)
        .eq("is_active", true)
        .maybeSingle();

      // Se não encontrar, tentar pelo subdomain original
      if (sqlError || !sqlSite) {
        const { data: sqlSite2, error: sqlError2 } = await supabase
          .from("client_sites")
          .select("*")
          .ilike("subdomain", subdomain.toLowerCase())
          .eq("is_active", true)
          .maybeSingle();

        if (!sqlError2 && sqlSite2) {
          sqlSite = sqlSite2;
          sqlError = sqlError2;
        }
      }

      // Se ainda não encontrar, tentar pelo domain
      if (sqlError || !sqlSite) {
        const { data: sqlSite3, error: sqlError3 } = await supabase
          .from("client_sites")
          .select("*")
          .ilike("domain", subdomain.toLowerCase())
          .eq("is_active", true)
          .maybeSingle();

        if (!sqlError3 && sqlSite3) {
          sqlSite = sqlSite3;
        }
      }

      if (sqlSite) {
        site = sqlToClientSiteConfig(sqlSite);
      }
    } catch (err) {
      // Tabela não existe ou erro na query
      console.error("[CLIENT-SITES] Erro ao buscar site do SQL:", err);
      throw err;
    }

    if (!site) {
      console.log(
        `[CLIENT-SITES] Site não encontrado para subdomain: ${subdomain}`
      );
      return c.json(
        {
          success: false,
          error: "Site não encontrado para este subdomain",
        },
        404
      );
    }

    // 🔒 Proteção: usuário normal só pode ver o próprio site
    if (!auth.isSuperAdmin) {
      if (!auth.organizationId) {
        return c.json({ success: false, error: "Usuário sem organization_id" }, 403);
      }
      if (site.organizationId !== auth.organizationId) {
        return c.json({ success: false, error: "Acesso negado para este site" }, 403);
      }
    }

    console.log(
      `[CLIENT-SITES] Site encontrado: ${site.siteName} (${site.organizationId})`
    );
    console.log(`[CLIENT-SITES] Site ativo: ${site.isActive}`);
    console.log(`[CLIENT-SITES] Tem siteCode: ${!!site.siteCode}`);
    console.log(
      `[CLIENT-SITES] siteCode tamanho: ${
        site.siteCode ? site.siteCode.length : 0
      } caracteres`
    );
    console.log(`[CLIENT-SITES] Tem archivePath: ${!!site.archivePath}`);
    console.log(`[CLIENT-SITES] archivePath: ${site.archivePath || "N/A"}`);
    console.log(`[CLIENT-SITES] Tem archiveUrl: ${!!site.archiveUrl}`);
    console.log(`[CLIENT-SITES] archiveUrl: ${site.archiveUrl || "N/A"}`);

    // Log completo do objeto site (sem siteCode se for muito grande)
    const siteForLog = { ...site };
    if (siteForLog.siteCode && siteForLog.siteCode.length > 500) {
      siteForLog.siteCode = `${siteForLog.siteCode.substring(
        0,
        500
      )}... [truncado, tamanho total: ${siteForLog.siteCode.length}]`;
    }
    console.log(
      `[CLIENT-SITES] Site completo:`,
      JSON.stringify(siteForLog, null, 2)
    );

    // Retornar site (rota pública, mas não retornar dados sensíveis se necessário)
    return c.json({
      success: true,
      data: site,
    });
  } catch (error) {
    console.error("[CLIENT-SITES] Erro ao buscar site por subdomain:", error);
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

// GET /make-server-67caf26a/client-sites/by-domain/:domain
// Buscar site por domínio (para roteamento)
app.get("/by-domain/:domain", async (c) => {
  try {
    const { domain } = c.req.param();

    const auth = await requireSqlAuth(c);
    if (auth instanceof Response) return auth;

    const supabase = getSupabaseClient();

    // Buscar site por domínio do SQL
    const { data: sqlSite, error: sqlError } = await supabase
      .from("client_sites")
      .select("*")
      .or(
        `domain.ilike.${domain},subdomain.ilike.${domain.replace(
          ".rendizy.app",
          ""
        )}`
      )
      .eq("is_active", true)
      .maybeSingle();

    if (sqlError || !sqlSite) {
      return c.json(
        {
          success: false,
          error: "Site não encontrado para este domínio",
        },
        404
      );
    }

    const site = sqlToClientSiteConfig(sqlSite);

    // 🔒 Proteção: usuário normal só pode ver o próprio site
    if (!auth.isSuperAdmin) {
      if (!auth.organizationId) {
        return c.json({ success: false, error: "Usuário sem organization_id" }, 403);
      }
      if (site.organizationId !== auth.organizationId) {
        return c.json({ success: false, error: "Acesso negado para este site" }, 403);
      }
    }
    return c.json({ success: true, data: site });
  } catch (error) {
    console.error("[CLIENT-SITES] Erro ao buscar site por domínio:", error);
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

// DELETE /make-server-67caf26a/client-sites/:organizationId
// Desativar site (soft delete)
app.delete("/:organizationId", async (c) => {
  try {
    const { organizationId } = c.req.param();

    const auth = await requireOrganizationAccess(c, organizationId);
    if (auth instanceof Response) return auth;

    const supabase = getSupabaseClient();

    // Buscar site existente do SQL
    const { data: existing, error: fetchError } = await supabase
      .from("client_sites")
      .select("*")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (fetchError || !existing) {
      return c.json(
        {
          success: false,
          error: "Site não encontrado",
        },
        404
      );
    }

    // Desativar (soft delete) no SQL
    const { error: updateError } = await supabase
      .from("client_sites")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", organizationId);

    if (updateError) {
      throw updateError;
    }

    console.log(`[CLIENT-SITES] Site desativado:`, organizationId);

    return c.json({
      success: true,
      message: "Site desativado com sucesso!",
    });
  } catch (error) {
    console.error("[CLIENT-SITES] Erro ao desativar site:", error);
    return c.json(
      {
        success: false,
        error: error.message,
      },
      500
    );
  }
});

// ============================================================
// ROTA PARA SERVIR ASSETS ESTÁTICOS DO ZIP (JS, CSS, imagens)
// ============================================================
// OPTIONS para CORS (deve vir ANTES do GET)
app.options("/assets/:subdomain/*", async (c) => {
  return c.text("", 200);
});

// GET /make-server-67caf26a/client-sites/assets/:subdomain/*
// Serve arquivos estáticos (JS, CSS, imagens) do ZIP do site
// ✅ ROTA PÚBLICA - Não requer autenticação
app.get("/assets/:subdomain/*", async (c) => {
  try {
    const subdomain = c.req.param("subdomain");
    // Extrair o caminho do asset após /assets/:subdomain/
    const fullPath = c.req.path;
    const assetPathMatch = fullPath.match(
      new RegExp(`/assets/${subdomain}/(.+)$`)
    );
    const assetPath = assetPathMatch ? assetPathMatch[1] : "";

    console.log(
      `[CLIENT-SITES] Asset solicitado: ${assetPath} para subdomain: ${subdomain}`
    );

    if (!assetPath) {
      return c.json(
        { success: false, error: "Caminho do asset não fornecido" },
        400
      );
    }

    // Segurança: bloquear traversal e paths estranhos
    const unsafe = assetPath.includes("\u0000") || assetPath.includes("\\") || assetPath.split("/").includes("..") || assetPath.startsWith("/");
    if (unsafe) {
      return c.json({ success: false, error: "Caminho inválido" }, 400);
    }

    // Buscar site por subdomain do SQL
    const supabase = getSupabaseClient();

    // Buscar site por subdomain do SQL
    const { data: sqlSite, error: sqlError } = await supabase
      .from("client_sites")
      .select("*")
      .eq("subdomain", subdomain)
      .eq("is_active", true)
      .maybeSingle();

    if (sqlError || !sqlSite || !sqlSite.archive_path) {
      return c.json(
        { success: false, error: "Site não encontrado ou sem arquivo" },
        404
      );
    }

    const archivePath = sqlSite.archive_path;

    // Download do ZIP do storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("client-sites")
      .download(archivePath);

    if (downloadError || !fileData) {
      console.error(`[CLIENT-SITES] Erro ao baixar ZIP:`, downloadError);
      return c.json(
        { success: false, error: "Erro ao acessar arquivo do site" },
        500
      );
    }

    // Extrair arquivo do ZIP
    const arrayBuffer = await fileData.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // Buscar arquivo no ZIP (tentar diferentes variações do caminho)
    // Normalizar assetPath (remover barra inicial se houver)
    const normalizedPath = assetPath.replace(/^\//, "");
    const normalizedLower = normalizedPath.toLowerCase();

    // ✅ Segurança: servir APENAS conteúdos dentro de dist/
    // (evita exfiltração de src/, configs, etc)
    const baseNormalized = normalizedLower.startsWith("dist/")
      ? normalizedPath
      : `dist/${normalizedPath}`;

    console.log(`[CLIENT-SITES] Caminho normalizado: ${normalizedPath}`);

    let file: any = null;
    let foundPath: string | null = null;

    const possiblePaths = [
      baseNormalized,
      `dist/${baseNormalized.replace(/^dist\//, "")}`,
      `dist/dist/${baseNormalized.replace(/^dist\//, "")}`,
    ];

    // Adicionar variações com prefixos de pasta raiz
    const allZipDirs = Object.keys(zip.files).filter((f) => zip.files[f].dir);
    const rootDirs = allZipDirs
      .map((d) => d.split("/")[0])
      .filter((d, i, arr) => arr.indexOf(d) === i && d)
      .slice(0, 3); // Limitar a 3 para performance

    for (const rootDir of rootDirs) {
      possiblePaths.push(
        `${rootDir}/${baseNormalized}`,
        `${rootDir}/project/${baseNormalized}`,
        `${rootDir}/project/dist/${baseNormalized.replace(/^dist\//, "")}`,
        `${rootDir}/project/dist/dist/${baseNormalized.replace(/^dist\//, "")}`,
        `${rootDir}/dist/${baseNormalized.replace(/^dist\//, "")}`,
        `${rootDir}/dist/dist/${baseNormalized.replace(/^dist\//, "")}`
      );
    }

    console.log(
      `[CLIENT-SITES] Tentando ${possiblePaths.length} caminhos possíveis...`
    );

    for (const path of possiblePaths) {
      const zipFile = zip.files[path];
      if (zipFile && !zipFile.dir) {
        file = zipFile;
        foundPath = path;
        console.log(
          `[CLIENT-SITES] ✅ Asset encontrado pelo caminho: ${foundPath}`
        );
        break;
      }
    }

    if (!file) {
      console.warn(`[CLIENT-SITES] Asset não encontrado: ${assetPath}`);
      console.warn(`[CLIENT-SITES] Caminhos tentados:`, possiblePaths);
      return c.json(
        {
          success: false,
          error: "Asset não encontrado",
        },
        404
      );
    }

    console.log(`[CLIENT-SITES] ✅ Asset encontrado: ${foundPath}`);

    // Determinar Content-Type baseado na extensão
    const ext = foundPath.split(".").pop()?.toLowerCase() || "";
    const contentTypes: Record<string, string> = {
      js: "application/javascript",
      mjs: "application/javascript",
      ts: "application/typescript",
      tsx: "application/typescript",
      css: "text/css",
      html: "text/html",
      htm: "text/html",
      json: "application/json",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      svg: "image/svg+xml",
      webp: "image/webp",
      ico: "image/x-icon",
      woff: "font/woff",
      woff2: "font/woff2",
      ttf: "font/ttf",
      eot: "application/vnd.ms-fontobject",
    };

    const contentType = contentTypes[ext] || "application/octet-stream";

    // Extrair conteúdo do arquivo
    if (
      ext === "png" ||
      ext === "jpg" ||
      ext === "jpeg" ||
      ext === "gif" ||
      ext === "svg" ||
      ext === "webp" ||
      ext === "ico"
    ) {
      // Arquivo binário (imagem)
      const blob = await file.async("blob");
      c.header("Content-Type", contentType);
      c.header("Cache-Control", "public, max-age=3600");
      return c.body(await blob.arrayBuffer(), 200);
    } else {
      // Arquivo de texto (JS, CSS, HTML, etc)
      // ✅ CORREÇÃO: Servir como ArrayBuffer para evitar que Supabase force text/plain
      // Mesmo sendo texto, servimos como binário com Content-Type correto
      const finalContentType = contentType.includes("javascript")
        ? "application/javascript; charset=utf-8"
        : contentType.includes("css")
        ? "text/css; charset=utf-8"
        : contentType;

      console.log(
        `[CLIENT-SITES] Servindo asset ${assetPath} como binário com Content-Type: ${finalContentType}`
      );

      // Obter como ArrayBuffer (binário) ao invés de string
      const arrayBuffer = await file.async("arraybuffer");

      // Definir headers antes de retornar
      c.header("Content-Type", finalContentType);
      c.header("Cache-Control", "public, max-age=3600");

      // Retornar como binário (ArrayBuffer) para evitar detecção como texto
      return c.body(arrayBuffer, 200);
    }
  } catch (error) {
    console.error(`[CLIENT-SITES] Erro ao servir asset:`, error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      500
    );
  }
});

// ============================================================
// API PÚBLICA PARA IMÓVEIS DO CLIENTE (para exibir no site)
// ============================================================
// GET /make-server-67caf26a/client-sites/api/:subdomain/properties
// Lista imóveis da organização associada ao site (público, sem autenticação)
app.get("/api/:subdomain/properties", async (c) => {
  try {
    const subdomain = c.req.param("subdomain");

    console.log(
      `[CLIENT-SITES] API pública de imóveis solicitada para subdomain: ${subdomain}`
    );

    // Buscar site por subdomain do SQL
    const supabase = getSupabaseClient();
    const { data: sqlSite, error: sqlError } = await supabase
      .from("client_sites")
      .select("*")
      .eq("subdomain", subdomain)
      .eq("is_active", true)
      .maybeSingle();

    if (sqlError || !sqlSite) {
      return c.json(
        {
          success: false,
          error: "Site não encontrado",
        },
        404
      );
    }

    const organizationId = sqlSite.organization_id;
    console.log(
      `[CLIENT-SITES] Buscando imóveis para organização: ${organizationId}`
    );

    // ✅ MIGRAÇÃO 2026-01-06: Tabela `properties` removida - usar apenas properties
    const { data: anuncios, error } = await supabase
      .from("properties")
      .select("id,status,organization_id,data,created_at,updated_at")
      .eq("organization_id", organizationId)
      .in("status", ["active", "published"])
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error(`[CLIENT-SITES] Erro ao buscar properties:`, error);
      return c.json(
        {
          success: false,
          error: "Erro ao buscar imóveis",
          details: error.message,
        },
        500
      );
    }

    const formattedProperties = (anuncios || []).map((row: any) => {
      const d = row?.data || {};
      const photos = Array.isArray(d.fotos)
        ? d.fotos
        : Array.isArray(d.photos)
        ? d.photos
        : d.fotoPrincipal
        ? [d.fotoPrincipal]
        : [];

      return {
        id: row.id,
        name: d.title || d.name || d.internalId || "Imóvel",
        code: d.codigo || d.propertyCode || d?.externalIds?.staysnet_listing_code || row.id,
        type: d.type || d.tipoAcomodacao || d.tipoLocal || "apartment",
        status: row.status || d.status || "active",
        address: {
          city: d?.address?.city || d.cidade || null,
          state: d?.address?.state || d.sigla_estado || null,
          street: d?.address?.street || d.rua || null,
          number: d?.address?.number || d.numero || null,
          neighborhood: d?.address?.neighborhood || d.bairro || null,
          zipCode: d?.address?.zipCode || d.cep || null,
          country: d?.address?.country || d.pais || "BR",
          latitude: d?.address?.latitude ?? null,
          longitude: d?.address?.longitude ?? null,
        },
        pricing: {
          basePrice: Number(d?.pricing?.basePrice ?? d.basePrice ?? d.dailyRate ?? 0) || 0,
          currency: d?.pricing?.currency || d.currency || "BRL",
        },
        capacity: {
          bedrooms: Number(d.bedrooms ?? d.quartos ?? 0) || 0,
          bathrooms: Number(d.bathrooms ?? d.banheiros ?? 0) || 0,
          maxGuests: Number(d.guests ?? d.maxGuests ?? d.hospedes ?? 0) || 0,
          area: Number(d.area ?? 0) || null,
        },
        description: d.description || d.shortDescription || "",
        shortDescription: d.shortDescription || null,
        photos,
        coverPhoto:
          d.fotoPrincipal ||
          d.coverPhoto ||
          (Array.isArray(photos) && photos.length > 0 ? photos[0] : null),
        tags: Array.isArray(d.tags) ? d.tags : [],
        amenities: Array.isArray(d.comodidades)
          ? d.comodidades
          : Array.isArray(d.amenities)
          ? d.amenities
          : Array.isArray(d.comodidadesStaysnetIds)
          ? d.comodidadesStaysnetIds
          : [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    console.log(
      `[CLIENT-SITES] ✅ ${formattedProperties.length} imóveis encontrados para organização ${organizationId}`
    );

    return c.json({
      success: true,
      data: formattedProperties,
      total: formattedProperties.length,
    });
  } catch (error) {
    console.error(`[CLIENT-SITES] Erro na API pública de imóveis:`, error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      500
    );
  }
});

// OPTIONS para CORS
app.options("/api/:subdomain/properties", async (c) => {
  return c.text("", 200);
});

// ROTA TEMPORÁRIA: Migração de KV Store para SQL
// POST /make-server-67caf26a/client-sites/migrate-kv-to-sql
app.post("/migrate-kv-to-sql", async (c) => {
  try {
    const auth = await requireSqlAuth(c);
    if (auth instanceof Response) return auth;
    if (!auth.isSuperAdmin) {
      return c.json({ success: false, error: "Acesso negado" }, 403);
    }

    const supabase = getSupabaseClient();
    const body = await c.req.json();
    const organizationId = body.organizationId;

    if (!organizationId || typeof organizationId !== "string") {
      return c.json(
        { success: false, error: "organizationId é obrigatório" },
        400
      );
    }

    // Buscar do KV Store usando a tabela SQL diretamente (já que kv_store.tsx usa SQL)
    const { data: kvData } = await supabase
      .from("kv_store_67caf26a")
      .select("value")
      .eq("key", `client_site:${organizationId}`)
      .maybeSingle();

    if (!kvData || !kvData.value) {
      return c.json(
        {
          success: false,
          error: "Site não encontrado no KV Store",
        },
        404
      );
    }

    const kvSite = kvData.value as ClientSiteConfig;
    const sqlData = clientSiteConfigToSql(kvSite);

    // Verificar se já existe
    const { data: existing } = await supabase
      .from("client_sites")
      .select("id")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (existing) {
      // Atualizar
      const { error: updateError } = await supabase
        .from("client_sites")
        .update(sqlData)
        .eq("organization_id", organizationId);

      if (updateError) {
        throw updateError;
      }

      return c.json({
        success: true,
        message: "Site atualizado no SQL",
        data: sqlData,
      });
    } else {
      // Inserir
      const { error: insertError } = await supabase
        .from("client_sites")
        .insert(sqlData);

      if (insertError) {
        throw insertError;
      }

      return c.json({
        success: true,
        message: "Site migrado para SQL com sucesso",
        data: sqlData,
      });
    }
  } catch (error) {
    console.error("[CLIENT-SITES] Erro na migração:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro desconhecido",
      },
      500
    );
  }
});

// ============================================================
// VERCEL DEPLOYMENT API
// Build automático de sites do Bolt/v0 via Vercel
// ============================================================

/**
 * POST /client-sites/vercel/deploy
 * 
 * Inicia um deployment na Vercel a partir de arquivos do Storage.
 * 
 * Body:
 * - subdomain: string - Subdomain do site (ex: "medhome")
 * - files: Array<{path: string, content: string}> - Arquivos fonte (opcional, se já não estiverem no storage)
 * 
 * Retorna:
 * - deploymentId: string - ID do deployment para polling
 * - deploymentUrl: string - URL onde o site será publicado
 */
app.post("/vercel/deploy", async (c) => {
  try {
    // Verificar se token está configurado
    if (!VERCEL_ACCESS_TOKEN) {
      return c.json({
        success: false,
        error: "VERCEL_ACCESS_TOKEN não configurado",
        details: "Configure o secret: supabase secrets set VERCEL_ACCESS_TOKEN=<seu-token>",
        howToGet: "https://vercel.com/account/tokens"
      }, 500);
    }

    const { subdomain, files } = await c.req.json();

    if (!subdomain) {
      return c.json({ success: false, error: "subdomain é obrigatório" }, 400);
    }

    // Buscar configuração do site
    const supabase = await getSupabaseClient(c, { useServiceRole: true });
    
    const { data: siteConfig, error: siteError } = await supabase
      .from("client_sites")
      .select("*")
      .eq("subdomain", subdomain)
      .maybeSingle();

    if (siteError || !siteConfig) {
      return c.json({ 
        success: false, 
        error: "Site não encontrado", 
        subdomain 
      }, 404);
    }

    // Se files não foi passado, buscar do Storage
    let deployFiles = files;
    if (!deployFiles || deployFiles.length === 0) {
      // Listar arquivos do storage para este site
      const { data: storageFiles, error: storageError } = await supabase
        .storage
        .from("client-sites")
        .list(`${siteConfig.organization_id}/`, { limit: 500 });

      if (storageError) {
        return c.json({ 
          success: false, 
          error: "Erro ao buscar arquivos do storage",
          details: storageError.message
        }, 500);
      }

      if (!storageFiles || storageFiles.length === 0) {
        return c.json({ 
          success: false, 
          error: "Nenhum arquivo encontrado no storage para este site",
          hint: "Faça upload do ZIP do site primeiro"
        }, 400);
      }

      // Ler conteúdo de cada arquivo
      deployFiles = [];
      for (const file of storageFiles) {
        if (file.name.startsWith('.') || file.name === 'node_modules') continue;
        
        const { data: fileData } = await supabase
          .storage
          .from("client-sites")
          .download(`${siteConfig.organization_id}/${file.name}`);

        if (fileData) {
          const content = await fileData.text();
          deployFiles.push({
            file: file.name,
            data: content
          });
        }
      }
    } else {
      // Converter formato do frontend para formato da Vercel API
      deployFiles = files.map((f: { path: string; content: string }) => ({
        file: f.path,
        data: f.content
      }));
    }

    // Preparar payload para Vercel Deployments API
    const vercelPayload = {
      name: `rendizy-site-${subdomain}`,
      files: deployFiles,
      projectSettings: {
        framework: "vite",
        buildCommand: "npm run build",
        outputDirectory: "dist",
        installCommand: "npm install"
      },
      target: "production"
    };

    // Headers da Vercel API
    const vercelHeaders: Record<string, string> = {
      "Authorization": `Bearer ${VERCEL_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    };

    // Adicionar Team ID se configurado
    let vercelUrl = "https://api.vercel.com/v13/deployments";
    if (VERCEL_TEAM_ID) {
      vercelUrl += `?teamId=${VERCEL_TEAM_ID}`;
    }

    console.log(`[VERCEL] Creating deployment for ${subdomain}...`);
    console.log(`[VERCEL] Files count: ${deployFiles.length}`);

    // Chamar API da Vercel
    const vercelResponse = await fetch(vercelUrl, {
      method: "POST",
      headers: vercelHeaders,
      body: JSON.stringify(vercelPayload)
    });

    const vercelData = await vercelResponse.json();

    if (!vercelResponse.ok) {
      console.error("[VERCEL] Deployment failed:", vercelData);
      return c.json({
        success: false,
        error: "Erro ao criar deployment na Vercel",
        vercelError: vercelData.error || vercelData,
        status: vercelResponse.status
      }, 500);
    }

    console.log(`[VERCEL] Deployment created: ${vercelData.id}`);

    // Salvar deployment ID no banco
    await supabase
      .from("client_sites")
      .update({
        vercel_deployment_id: vercelData.id,
        vercel_deployment_url: vercelData.url,
        vercel_deployment_status: "BUILDING",
        updated_at: new Date().toISOString()
      })
      .eq("id", siteConfig.id);

    return c.json({
      success: true,
      deploymentId: vercelData.id,
      deploymentUrl: `https://${vercelData.url}`,
      readyState: vercelData.readyState,
      message: "Deployment iniciado! O build pode levar alguns minutos."
    });

  } catch (error) {
    console.error("[VERCEL] Error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido"
    }, 500);
  }
});

/**
 * GET /client-sites/vercel/status/:deploymentId
 * 
 * Verifica o status de um deployment na Vercel.
 */
app.get("/vercel/status/:deploymentId", async (c) => {
  try {
    if (!VERCEL_ACCESS_TOKEN) {
      return c.json({
        success: false,
        error: "VERCEL_ACCESS_TOKEN não configurado"
      }, 500);
    }

    const deploymentId = c.req.param("deploymentId");

    let vercelUrl = `https://api.vercel.com/v13/deployments/${deploymentId}`;
    if (VERCEL_TEAM_ID) {
      vercelUrl += `?teamId=${VERCEL_TEAM_ID}`;
    }

    const response = await fetch(vercelUrl, {
      headers: {
        "Authorization": `Bearer ${VERCEL_ACCESS_TOKEN}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      return c.json({
        success: false,
        error: "Erro ao buscar status",
        vercelError: data.error
      }, response.status);
    }

    return c.json({
      success: true,
      deploymentId: data.id,
      url: data.url ? `https://${data.url}` : null,
      readyState: data.readyState, // QUEUED, BUILDING, READY, ERROR, CANCELED
      createdAt: data.createdAt,
      buildingAt: data.buildingAt,
      ready: data.ready,
      state: data.state,
      // Erros de build
      errorCode: data.errorCode,
      errorMessage: data.errorMessage
    });

  } catch (error) {
    console.error("[VERCEL] Status check error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido"
    }, 500);
  }
});

/**
 * POST /client-sites/vercel/build-from-zip
 * 
 * Fluxo completo: recebe ZIP do Bolt, extrai, faz deploy na Vercel.
 * Este é o endpoint principal que o modal de importação vai usar.
 * 
 * Suporta token individual do cliente (hosting_providers.vercel.access_token)
 * ou fallback para token global do sistema.
 */
app.post("/vercel/build-from-zip", async (c) => {
  try {
    const formData = await c.req.formData();
    const zipFile = formData.get("file") as File | null;
    const subdomain = formData.get("subdomain") as string;

    if (!zipFile) {
      return c.json({ success: false, error: "Arquivo ZIP é obrigatório" }, 400);
    }

    if (!subdomain) {
      return c.json({ success: false, error: "subdomain é obrigatório" }, 400);
    }

    // Buscar configurações de hospedagem do site
    const supabase = await getSupabaseClient(c, { useServiceRole: true });
    const { data: siteData } = await supabase
      .from("client_sites")
      .select("hosting_providers")
      .eq("subdomain", subdomain)
      .single();

    // Determinar qual token usar: do cliente ou global
    const hostingConfig = siteData?.hosting_providers?.vercel || {};
    const useGlobalToken = hostingConfig.use_global_token !== false;
    const clientToken = hostingConfig.access_token;
    const clientTeamId = hostingConfig.team_id;

    // Token final a usar
    const vercelToken = useGlobalToken || !clientToken ? VERCEL_ACCESS_TOKEN : clientToken;
    const vercelTeamId = useGlobalToken ? VERCEL_TEAM_ID : (clientTeamId || VERCEL_TEAM_ID);

    if (!vercelToken) {
      return c.json({
        success: false,
        error: "Token Vercel não configurado",
        details: useGlobalToken 
          ? "Configure o token global: supabase secrets set VERCEL_ACCESS_TOKEN=<token>"
          : "Configure o token do cliente na aba Hospedagem do site",
        howToGet: "https://vercel.com/account/tokens"
      }, 500);
    }

    console.log(`[VERCEL] Processing ZIP for ${subdomain}, size: ${zipFile.size}, using ${useGlobalToken ? 'global' : 'client'} token`);


    // Ler e extrair ZIP
    const zipBuffer = await zipFile.arrayBuffer();
    const zip = await JSZip.loadAsync(zipBuffer);
    
    // Detectar pasta raiz do projeto (onde está o package.json)
    let rootPrefix = "";
    for (const filePath of Object.keys(zip.files)) {
      // Procurar package.json em qualquer nível
      if (filePath.endsWith("package.json") && !filePath.includes("node_modules/")) {
        const lastSlash = filePath.lastIndexOf("/");
        if (lastSlash > 0) {
          // package.json está em subpasta - usar como raiz
          rootPrefix = filePath.substring(0, lastSlash + 1);
          console.log(`[VERCEL] Detected project root: "${rootPrefix}"`);
        }
        break;
      }
    }
    
    // Converter arquivos para formato Vercel
    const deployFiles: Array<{ file: string; data: string }> = [];
    
    for (const [path, file] of Object.entries(zip.files)) {
      // Ignorar diretórios e arquivos desnecessários
      if (file.dir) continue;
      if (path.includes("node_modules/")) continue;
      if (path.includes(".git/")) continue;
      if (path.startsWith("__MACOSX/")) continue;
      if (path.endsWith(".DS_Store")) continue;

      try {
        const content = await file.async("string");
        
        // Normalizar path (remover pasta raiz detectada)
        let normalizedPath = path;
        if (rootPrefix && path.startsWith(rootPrefix)) {
          normalizedPath = path.substring(rootPrefix.length);
        }
        
        if (normalizedPath) {
          deployFiles.push({
            file: normalizedPath,
            data: content
          });
        }
      } catch (e) {
        // Arquivo binário - pular por enquanto
        console.log(`[VERCEL] Skipping binary file: ${path}`);
      }
    }

    if (deployFiles.length === 0) {
      return c.json({ 
        success: false, 
        error: "Nenhum arquivo válido encontrado no ZIP" 
      }, 400);
    }

    console.log(`[VERCEL] Extracted ${deployFiles.length} files from root "${rootPrefix || '(root)'}"`);

    // Verificar se tem package.json
    const hasPackageJson = deployFiles.some(f => f.file === "package.json");
    if (!hasPackageJson) {
      // Listar primeiros arquivos para debug
      const sampleFiles = deployFiles.slice(0, 5).map(f => f.file);
      console.error(`[VERCEL] package.json not found. Sample files: ${sampleFiles.join(", ")}`);
      return c.json({
        success: false,
        error: "package.json não encontrado no ZIP",
        hint: "Certifique-se de que o ZIP contém um projeto Node.js válido",
        detectedRoot: rootPrefix || "(none)",
        sampleFiles
      }, 400);
    }

    // Criar deployment na Vercel
    const vercelPayload = {
      name: `rendizy-site-${subdomain}`,
      files: deployFiles,
      projectSettings: {
        framework: "vite",
        buildCommand: "npm run build",
        outputDirectory: "dist",
        installCommand: "npm install"
      },
      target: "production"
    };

    let vercelUrl = "https://api.vercel.com/v13/deployments";
    if (vercelTeamId) {
      vercelUrl += `?teamId=${vercelTeamId}`;
    }

    const vercelResponse = await fetch(vercelUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${vercelToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(vercelPayload)
    });

    const vercelData = await vercelResponse.json();

    if (!vercelResponse.ok) {
      console.error("[VERCEL] Deploy failed:", vercelData);
      return c.json({
        success: false,
        error: "Erro ao criar deployment",
        vercelError: vercelData.error || vercelData,
        tokenType: useGlobalToken ? 'global' : 'client'
      }, 500);
    }

    console.log(`[VERCEL] Deployment created: ${vercelData.id} (${useGlobalToken ? 'global' : 'client'} token)`);

    // Atualizar banco com info do deployment (tanto nas colunas antigas quanto no JSONB novo)
    await supabase
      .from("client_sites")
      .update({
        vercel_deployment_id: vercelData.id,
        vercel_deployment_url: vercelData.url,
        vercel_deployment_status: "BUILDING",
        source: "bolt",
        updated_at: new Date().toISOString(),
        // Atualizar também no novo formato JSONB
        hosting_providers: {
          ...siteData?.hosting_providers,
          active_provider: 'vercel',
          vercel: {
            ...hostingConfig,
            last_deployment_id: vercelData.id,
            last_deployment_url: `https://${vercelData.url}`,
            last_deployment_status: "BUILDING",
            last_deployment_at: new Date().toISOString()
          }
        }
      })
      .eq("subdomain", subdomain);

    return c.json({
      success: true,
      message: "Build iniciado na Vercel!",
      deploymentId: vercelData.id,
      deploymentUrl: `https://${vercelData.url}`,
      readyState: vercelData.readyState,
      filesCount: deployFiles.length,
      tokenType: useGlobalToken ? 'global' : 'client',
      pollingEndpoint: `/client-sites/vercel/status/${vercelData.id}`
    });

  } catch (error) {
    console.error("[VERCEL] Build from ZIP error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido"
    }, 500);
  }
});

/**
 * GET /client-sites/vercel/config
 * 
 * Retorna configuração atual da Vercel (sem expor token).
 * Útil para debug e verificar se está configurado.
 */
app.get("/vercel/config", async (c) => {
  return c.json({
    success: true,
    configured: !!VERCEL_ACCESS_TOKEN,
    hasTeamId: !!VERCEL_TEAM_ID,
    hasProjectId: !!VERCEL_PROJECT_ID,
    message: VERCEL_ACCESS_TOKEN 
      ? "Vercel API configurada e pronta!" 
      : "VERCEL_ACCESS_TOKEN não configurado. Vá em https://vercel.com/account/tokens"
  });
});

export default app;