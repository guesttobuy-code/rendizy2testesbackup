// routes-client-sites.ts
// Sistema de gerenciamento de sites customizados por cliente
// Permite importar sites de v0.dev, Bolt.ai, Figma, etc e integrá-los ao RENDIZY

import { Hono } from "npm:hono";
// ✅ REFATORADO v1.0.103.500 - Helper híbrido para organization_id (UUID)
import { getOrganizationIdOrThrow } from "./utils-get-organization-id.ts";
import { getSupabaseClient } from "./kv_store.tsx";
import JSZip from "npm:jszip";
import { SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, SUPABASE_PROJECT_REF } from './utils-env.ts';

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

  // ✅ PRIORIDADE 2: Cookie HttpOnly (quando aplicável)
  const cookieHeader = c.req.header("Cookie") || "";
  const cookies = parseCookies(cookieHeader);
  const tokenFromCookie = cookies["rendizy-token"];
  if (tokenFromCookie) return tokenFromCookie;

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
    site_code: config.siteCode || null,
    archive_path: config.archivePath || null,
    archive_url: config.archiveUrl || null,
    extracted_base_url: config.extractedBaseUrl || null,
    extracted_files_count: config.extractedFilesCount || null,
    source: config.source || "custom",
    is_active: config.isActive,
    created_at: config.createdAt || new Date().toISOString(),
    updated_at: config.updatedAt || new Date().toISOString(),
  };
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
      template: template || "moderno",
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

    // Tentar criar o bucket caso ainda não exista (ignorar erro de já existente)
    try {
      await supabase.storage.createBucket(bucketName, {
        public: false,
      });
    } catch (_err) {
      // Se já existir, ignoramos
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

    for (const [zipPath, zipFile] of Object.entries(zip.files)) {
      // Ignorar diretórios e arquivos ocultos
      if (
        zipFile.dir ||
        zipPath.startsWith(".") ||
        zipPath.includes("__MACOSX")
      ) {
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

    const fetchResponse = await fetch(url);

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
    const fileName = normalizedPath.split("/").pop() || normalizedPath;

    // ✅ ESTRATÉGIA: Buscar pelo nome do arquivo primeiro, depois pelo caminho completo
    // Isso resolve o problema de ZIPs com estrutura de pastas variável
    const allZipFiles = Object.keys(zip.files).filter((f) => !zip.files[f].dir);

    console.log(`[CLIENT-SITES] Procurando arquivo: ${fileName}`);
    console.log(`[CLIENT-SITES] Caminho normalizado: ${normalizedPath}`);

    let file: any = null;
    let foundPath: string | null = null;

    // 1. Buscar pelo nome do arquivo (mais robusto - funciona independente da estrutura)
    const filesByName = allZipFiles.filter((f) => f.endsWith(fileName));
    if (filesByName.length > 0) {
      // Se encontrou pelo nome, verificar se o caminho também corresponde (prioridade)
      const exactMatch = filesByName.find(
        (f) =>
          f.includes("dist") && f.includes("assets") && f.endsWith(fileName)
      );
      if (exactMatch) {
        foundPath = exactMatch;
        file = zip.files[exactMatch];
        console.log(
          `[CLIENT-SITES] ✅ Asset encontrado pelo nome (match exato): ${foundPath}`
        );
      } else {
        // Usar o primeiro encontrado
        foundPath = filesByName[0];
        file = zip.files[foundPath];
        console.log(
          `[CLIENT-SITES] ✅ Asset encontrado pelo nome: ${foundPath}`
        );
      }
    }

    // 2. Se não encontrou pelo nome, tentar pelo caminho completo (fallback)
    if (!file) {
      const possiblePaths = [
        normalizedPath,
        `dist/${normalizedPath}`,
        `dist/dist/${normalizedPath}`, // Caso especial: dist dentro de dist
        `src/${normalizedPath}`,
        `public/${normalizedPath}`,
      ];

      // Adicionar variações com prefixos de pasta raiz
      const allZipDirs = Object.keys(zip.files).filter((f) => zip.files[f].dir);
      const rootDirs = allZipDirs
        .map((d) => d.split("/")[0])
        .filter((d, i, arr) => arr.indexOf(d) === i && d)
        .slice(0, 3); // Limitar a 3 para performance

      for (const rootDir of rootDirs) {
        possiblePaths.push(
          `${rootDir}/${normalizedPath}`,
          `${rootDir}/project/${normalizedPath}`,
          `${rootDir}/project/dist/${normalizedPath}`,
          `${rootDir}/project/dist/dist/${normalizedPath}`,
          `${rootDir}/dist/${normalizedPath}`,
          `${rootDir}/dist/dist/${normalizedPath}`
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
    }

    if (!file) {
      console.warn(`[CLIENT-SITES] Asset não encontrado: ${assetPath}`);
      console.warn(`[CLIENT-SITES] Caminhos tentados:`, possiblePaths);

      // Listar TODOS os arquivos do ZIP para debug (não apenas os primeiros 20)
      const allZipFiles = Object.keys(zip.files).filter(
        (f) => !zip.files[f].dir
      );
      const allZipDirs = Object.keys(zip.files).filter((f) => zip.files[f].dir);

      console.warn(
        `[CLIENT-SITES] Total de arquivos no ZIP: ${allZipFiles.length}`
      );
      console.warn(
        `[CLIENT-SITES] Total de diretórios no ZIP: ${allZipDirs.length}`
      );
      console.warn(
        `[CLIENT-SITES] Estrutura de diretórios:`,
        allZipDirs.slice(0, 30)
      );
      console.warn(
        `[CLIENT-SITES] Arquivos que contêm 'assets' ou 'index':`,
        allZipFiles
          .filter(
            (f) =>
              f.toLowerCase().includes("assets") ||
              f.toLowerCase().includes("index")
          )
          .slice(0, 30)
      );
      console.warn(
        `[CLIENT-SITES] Todos os arquivos do ZIP (primeiros 100):`,
        allZipFiles.slice(0, 100)
      );

      // Tentar encontrar arquivos similares (por nome, não por caminho)
      const fileName = assetPath.split("/").pop() || assetPath;
      const similarFiles = allZipFiles.filter((f) =>
        f.toLowerCase().includes(fileName.toLowerCase())
      );

      return c.json(
        {
          success: false,
          error: "Asset não encontrado no ZIP",
          debug: {
            requestedPath: assetPath,
            normalizedPath: normalizedPath,
            fileName: fileName,
            triedPaths: possiblePaths,
            totalFilesInZip: allZipFiles.length,
            totalDirsInZip: allZipDirs.length,
            directories: allZipDirs.slice(0, 30),
            filesWithAssetsOrIndex: allZipFiles
              .filter(
                (f) =>
                  f.toLowerCase().includes("assets") ||
                  f.toLowerCase().includes("index")
              )
              .slice(0, 30),
            similarFiles: similarFiles.slice(0, 10),
            allFiles: allZipFiles.slice(0, 100), // Primeiros 100 para não exceder limite
          },
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

    // Buscar imóveis da organização no SQL
    // Usar campos corretos da tabela properties
    const { data: properties, error } = await supabase
      .from("properties")
      .select(
        "id, name, code, type, status, address_city, address_state, address_street, address_number, address_zip_code, address_neighborhood, address_country, address_latitude, address_longitude, pricing_base_price, pricing_currency, bedrooms, bathrooms, max_guests, area, description, short_description, photos, cover_photo, tags, amenities, created_at, updated_at"
      )
      .eq("organization_id", organizationId)
      .eq("status", "active") // Apenas imóveis ativos
      .order("created_at", { ascending: false })
      .limit(100); // Limitar a 100 imóveis

    if (error) {
      console.error(`[CLIENT-SITES] Erro ao buscar imóveis:`, error);
      console.error(
        `[CLIENT-SITES] Detalhes do erro:`,
        JSON.stringify(error, null, 2)
      );
      return c.json(
        {
          success: false,
          error: "Erro ao buscar imóveis",
          details: error.message,
        },
        500
      );
    }

    console.log(
      `[CLIENT-SITES] ✅ ${
        properties?.length || 0
      } imóveis encontrados para organização ${organizationId}`
    );

    // Formatar resposta para o site
    const formattedProperties = (properties || []).map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      type: p.type,
      status: p.status,
      address: {
        city: p.address_city || null,
        state: p.address_state || null,
        street: p.address_street || null,
        number: p.address_number || null,
        neighborhood: p.address_neighborhood || null,
        zipCode: p.address_zip_code || null,
        country: p.address_country || "BR",
        latitude: p.address_latitude || null,
        longitude: p.address_longitude || null,
      },
      pricing: {
        basePrice: p.pricing_base_price || 0,
        currency: p.pricing_currency || "BRL",
      },
      capacity: {
        bedrooms: p.bedrooms || 0,
        bathrooms: p.bathrooms || 0,
        maxGuests: p.max_guests || 0,
        area: p.area || null,
      },
      description: p.description || p.short_description || "",
      shortDescription: p.short_description || null,
      photos: Array.isArray(p.photos) ? p.photos : p.photos ? [p.photos] : [],
      coverPhoto:
        p.cover_photo ||
        (Array.isArray(p.photos) && p.photos.length > 0 ? p.photos[0] : null),
      tags: Array.isArray(p.tags) ? p.tags : [],
      amenities: Array.isArray(p.amenities) ? p.amenities : [],
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    // CORS headers para permitir acesso do site

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

export default app;