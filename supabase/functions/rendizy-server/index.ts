// Rendizy Backend API - Main Entry Point
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { getSupabaseClient } from "./kv_store.tsx";

// Import route handlers
import authApp from "./routes-auth.ts";
import * as locationsRoutes from "./routes-locations.ts";
import * as propertiesRoutes from "./routes-properties.ts";
import * as reservationsRoutes from "./routes-reservations.ts";
import * as guestsRoutes from "./routes-guests.ts";
import * as calendarRoutes from "./routes-calendar.ts";
import * as photosRoutes from "./routes-photos.ts";
import organizationsApp from "./routes-organizations.ts";
import * as organizationsRoutes from "./routes-organizations.ts";
import usersApp from "./routes-users.ts";
import clientsApp from "./routes-clients.ts";
import ownersApp from "./routes-owners.ts";
import { bookingcomRoutes } from "./routes-bookingcom.ts";
import listingsApp from "./routes-listings.ts";
import roomsApp from "./routes-rooms.ts";
import rulesApp from "./routes-rules.ts";
import pricingSettingsApp from "./routes-pricing-settings.ts";
import seasonalPricingApp from "./routes-seasonal-pricing.ts";
import icalApp from "./routes-ical.ts";
import settingsApp from "./routes-settings.ts";
import bulkPricingApp from "./routes-bulk-pricing.ts";
import quotationsApp from "./routes-quotations.ts";
import blocksApp from "./routes-blocks.ts";
import propertyTypesApp from "./routes-property-types.ts";
// ❌ DEPRECADO v1.0.103.406 - import propertyWizardApp from "./routes-property-wizard.ts";
import * as locationAmenitiesRoutes from "./routes-location-amenities.ts";
import * as staysnetRoutes from "./routes-staysnet.ts";
import * as amenitiesRoutes from "./routes-amenities.ts";
import * as aiRoutes from "./routes-ai.ts";
import * as automationsAIRoutes from "./routes-automations-ai.ts";
import * as automationsRoutes from "./routes-automations.ts";
import * as dealsRoutes from "./routes-deals.ts";
import * as servicesTicketsRoutes from "./routes-services-tickets.ts";
import * as serviceTemplatesRoutes from "./routes-service-templates.ts";
// ✅ MÓDULO FINANCEIRO v1.0.103.400
import * as financeiroRoutes from "./routes-financeiro.ts";
import * as conciliacaoRoutes from "./routes-conciliacao.ts";
// v1.0.103.319: WhatsApp Evolution API COMPLETA (40/40 rotas)
import { whatsappEvolutionRoutes } from "./routes-whatsapp-evolution.ts";
import { whatsappDataRoutes } from "./routes-whatsapp-data.ts";
import clientSitesApp from "./routes-client-sites.ts";
import shortIdsApp from "./routes-short-ids.ts";
import adminCleanupApp from "./routes-admin-cleanup.ts";
import resetRoutes from "./reset-database.ts";
import { seedDatabase } from "./seed-data.ts";
import { seedDatabaseNew } from "./seed-data-enhanced.ts";
import { seedTestProperties } from "./seed-data-test.ts";
import { seedCompleteTest } from "./seed-complete-test.ts";
import { migrateNormalizeProperties } from "./migrate-normalize-properties.ts";
// ✅ MELHORIA v1.0.103.400 - Migração Property.platforms → Listings
import { migratePropertiesToListingsRoute } from "./migrate-properties-to-listings.ts";
// ✅ MELHORIA v1.0.103.400 - Tenancy Middleware (Passo 2)
import { tenancyMiddleware } from "./utils-tenancy.ts";
// ✅ MELHORIA v1.0.103.400 - Tenants Routes (Passo 3)
import tenantsApp from "./routes-tenants.ts";
// ✅ CONSOLIDAÇÃO: Anúncios Ultimate dentro do servidor principal
import anunciosApp from "./routes-anuncios.ts";


const app = new Hono();

// ============================================================================
// CORS CONFIGURATION - DEVE VIR ANTES DE TUDO
// ============================================================================
// ✅ SOLUÇÃO SIMPLES: origin: '*' SEM credentials: true
// Seguindo regra: "Se funciona, não mudar"
// Tokens em localStorage + header Authorization funcionam perfeitamente
// ✅ SOLUÇÃO SIMPLES: origin: '*' SEM credentials: true
// Seguindo regra: "Se funciona, não mudar"
// Tokens em localStorage + header Authorization funcionam perfeitamente
app.use(
  "/*",
  async (c, next) => {
    // Handle preflight OPTIONS requests
    if (c.req.method === 'OPTIONS') {
      c.header('Access-Control-Allow-Origin', '*');
      c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
      c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, apikey, X-Auth-Token');
      // ✅ NÃO incluir Access-Control-Allow-Credentials (não usa cookies)
      return c.body(null, 204);
    }
    await next();
    // Add CORS headers to all responses
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, apikey, X-Auth-Token');
    // ✅ NÃO incluir Access-Control-Allow-Credentials (não usa cookies)
  }
);

// Enable logger (DEPOIS do CORS)
app.use("*", logger(console.log));

// ✅ DEBUG GLOBAL: Capturar TODAS as requisições para /make-server-67caf26a/auth/me
app.use("*", async (c, next) => {
  const path = c.req.path;
  const method = c.req.method;

  // ✅ DEBUG: Capturar TODAS as requisições (especialmente /organizations, /auth/me, /staysnet)
  if (path.includes("/organizations") || path.includes("/auth/me") || path.includes("/staysnet")) {
    console.log("🚨 [DEBUG GLOBAL] Requisição capturada para:", path);
    console.log("🚨 [DEBUG GLOBAL] URL completa:", c.req.url);
    console.log("🚨 [DEBUG GLOBAL] Method:", method);
    console.log("🚨 [DEBUG GLOBAL] Headers:", {
      "X-Auth-Token": c.req.header("X-Auth-Token")
        ? "present (" +
          (c.req.header("X-Auth-Token")?.substring(0, 20) || "") +
          "...)"
        : "missing",
      Authorization: c.req.header("Authorization") ? "present" : "missing",
      apikey: c.req.header("apikey") ? "present" : "missing",
      "Content-Type": c.req.header("Content-Type") || "missing",
    });

    // ✅ DEBUG ESPECÍFICO para /organizations
    if (path.includes("/organizations")) {
      console.log(
        "🚨 [DEBUG ORGANIZATIONS] === REQUISIÇÃO POST /organizations DETECTADA ==="
      );
      console.log("🚨 [DEBUG ORGANIZATIONS] Path:", path);
      console.log("🚨 [DEBUG ORGANIZATIONS] Method:", method);
      try {
        const body = await c.req
          .clone()
          .json()
          .catch(() => null);
        console.log(
          "🚨 [DEBUG ORGANIZATIONS] Body:",
          body ? JSON.stringify(body).substring(0, 200) : "null"
        );
      } catch (e) {
        console.log("🚨 [DEBUG ORGANIZATIONS] Erro ao ler body:", e);
      }
    }
  }
  await next();
});

// ============================================================================
// CLIENT SITES ROUTING MIDDLEWARE
// Intercepta requisições baseadas no Host header para servir sites de clientes
// Ex: medhome.rendizy.app -> serve o site da Medhome
// ============================================================================
app.use("*", async (c, next) => {
  const host = c.req.header("Host") || "";
  const path = c.req.path;

  // Ignorar se for uma rota de API ou admin
  if (
    path.startsWith("/rendizy-server/") ||
    path.startsWith("/functions/v1/rendizy-server/") ||
    path.includes("/api/") ||
    path.includes("/admin/")
  ) {
    await next();
    return;
  }

  // Extrair domínio do Host header
  const domain = host.split(":")[0].toLowerCase().trim();

  // Verificar se é um subdomínio rendizy.app ou domínio customizado conhecido
  if (
    domain &&
    (domain.endsWith(".rendizy.app") || domain.endsWith(".rendizy.com.br"))
  ) {
    try {
      // Buscar site pelo domínio
      const sites = await kv.getByPrefix<any>("client_site:");

      // Normalizar domínio para comparação
      const normalizeDomain = (d: string) =>
        d.toLowerCase().replace(/^www\./, "");
      const normalizedDomain = normalizeDomain(domain);

      // Procurar site correspondente
      const site = sites.find((s: any) => {
        if (!s.isActive) return false;

        // Verificar subdomínio rendizy.app
        if (s.subdomain) {
          const subdomainUrl = `${s.subdomain}.rendizy.app`;
          if (normalizeDomain(subdomainUrl) === normalizedDomain) return true;
        }

        // Verificar domínio customizado
        if (s.domain && normalizeDomain(s.domain) === normalizedDomain)
          return true;

        return false;
      });

      if (site) {
        console.log(
          `[CLIENT-SITES] Site encontrado para ${domain}: ${site.siteName}`
        );

        // Se tiver siteCode, servir diretamente
        if (site.siteCode) {
          c.header("Content-Type", "text/html; charset=utf-8");
          return c.html(site.siteCode, 200);
        }

        // Se tiver archivePath, servir arquivo do storage (TODO: extrair HTML do ZIP)
        if (site.archivePath) {
          const supabase = getSupabaseClient();
          const bucketName = "client-sites";

          const { data: fileData, error: downloadError } =
            await supabase.storage.from(bucketName).download(site.archivePath);

          if (!downloadError && fileData) {
            // TODO: Extrair e servir HTML do arquivo ZIP/TAR
            return c.html(
              `
              <!DOCTYPE html>
              <html>
              <head>
                <title>${site.siteName}</title>
                <meta charset="UTF-8">
              </head>
              <body>
                <h1>${site.siteName}</h1>
                <p>Site em processamento. O arquivo foi recebido mas ainda precisa ser extraído e servido.</p>
              </body>
              </html>
            `,
              200
            );
          }
        }

        // Servir página padrão se não tiver código
        return c.html(
          `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${site.siteName}</title>
            <meta charset="UTF-8">
            <style>
              body { 
                font-family: ${site.theme?.fontFamily || "Arial, sans-serif"}; 
                margin: 0; 
                padding: 0;
                background: linear-gradient(135deg, ${
                  site.theme?.primaryColor || "#3B82F6"
                } 0%, ${site.theme?.secondaryColor || "#1F2937"} 100%);
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
            </style>
          </head>
          <body>
            <div class="container">
              <h1>${site.siteName}</h1>
              <p>${
                site.siteConfig?.description || "Bem-vindo ao nosso site!"
              }</p>
              <p><small>Site em construção. Em breve, conteúdo completo estará disponível.</small></p>
            </div>
          </body>
          </html>
        `,
          200
        );
      }
    } catch (error) {
      console.error(
        "[CLIENT-SITES] Erro ao processar roteamento de site:",
        error
      );
      // Continuar com rotas normais se houver erro
    }
  }

  await next();
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get("/rendizy-server/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "Rendizy Backend API",
  });
});

// ============================================================================
// AUTHENTICATION ROUTES (v1.0.103.259)
// Sistema de Login Multi-Tenant: SuperAdmin + Imobiliárias
// ============================================================================

// ✅ SOLUÇÃO DEFINITIVA: Rota /auth/me usando o mesmo padrão das outras rotas (com make-server-67caf26a)
// ✅ IMPORTANTE: Registrar ANTES do middleware genérico para garantir que seja capturada primeiro
// Isso garante que funcione igual às outras rotas que já estão funcionando

// ✅ Função helper compartilhada para /auth/me
async function handleAuthMe(c: Context) {
  console.log("🚀 [auth/me] ROTA CHAMADA");
  console.log("🔍 [auth/me] Headers recebidos:", {
    "X-Auth-Token": c.req.header("X-Auth-Token")
      ? "present (" +
        (c.req.header("X-Auth-Token")?.substring(0, 20) || "") +
        "...)"
      : "missing",
    Authorization: c.req.header("Authorization") ? "present" : "missing",
    apikey: c.req.header("apikey") ? "present" : "missing",
  });

  // Atalho para ambiente local: devolve usuário fixo e evita dependência de banco
  const isLocal = Deno.env.get("LOCAL_MODE") === "true";
  if (isLocal) {
    console.log("🔓 [auth/me] LOCAL_MODE=true - retornando usuário fake (admin)");
    return c.json({
      success: true,
      user: {
        id: "local-admin",
        username: "admin",
        name: "Administrador Local",
        email: "admin@local.test",
        type: "superadmin",
        status: "active",
        organizationId: "local-org",
        organization: {
          id: "local-org",
          name: "Local Org",
          slug: "local-org",
        },
      },
      session: {
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
        lastActivity: new Date().toISOString(),
      },
    });
  }
  // Importar função diretamente para evitar problemas de roteamento
  const { getSessionFromToken } = await import("./utils-session.ts");
  const { getSupabaseClient } = await import("./kv_store.tsx");

  try {
    let token = c.req.header("X-Auth-Token");
    if (!token) {
      const authHeader = c.req.header("Authorization");
      token = authHeader?.split(" ")[1];
    }

    console.log(
      "🔍 [auth/me] Token extraído:",
      token ? token.substring(0, 20) + "..." : "NONE"
    );

    if (!token) {
      console.log("❌ [auth/me] Token não fornecido - retornando 401");
      return c.json(
        {
          success: false,
          error: "Token não fornecido",
        },
        401
      );
    }

    console.log(
      "🔍 [auth/me] Buscando sessão com token:",
      token?.substring(0, 20) + "..."
    );
    const session = await getSessionFromToken(token);

    console.log(
      "🔍 [auth/me] Resultado de getSessionFromToken:",
      session ? `Sessão encontrada: ${session.userId}` : "Sessão NÃO encontrada"
    );

    if (!session) {
      console.log("❌ [auth/me] Sessão não encontrada ou inválida");
      return c.json(
        {
          success: false,
          error: "Sessão inválida ou expirada",
          code: "SESSION_NOT_FOUND",
        },
        401
      );
    }

    console.log("✅ [auth/me] Sessão encontrada:", session.userId);

    const supabase = getSupabaseClient();
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", session.userId)
      .single();

    if (userError || !user) {
      console.error("❌ [auth/me] Usuário não encontrado:", userError);
      return c.json(
        {
          success: false,
          error: "Usuário não encontrado",
        },
        404
      );
    }

    let organization = null;
    if (user.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("id, name, slug")
        .eq("id", user.organization_id)
        .single();

      if (org) {
        organization = org;
      }
    }

    console.log("✅ [auth/me] Retornando dados do usuário:", user.username);

    return c.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        type: user.type,
        status: user.status,
        organizationId: user.organization_id || undefined,
        organization: organization
          ? {
              id: organization.id,
              name: organization.name,
              slug: organization.slug,
            }
          : null,
      },
      session: {
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        lastActivity: session.lastActivity,
      },
    });
  } catch (error) {
    console.error("❌ [auth/me] Erro ao verificar sessão:", error);
    return c.json(
      {
        success: false,
        error: "Erro ao verificar sessão",
      },
      500
    );
  }
}

// ✅ Rota alternativa sem make-server-67caf26a para compatibilidade com frontend
app.get("/rendizy-server/auth/me", handleAuthMe);

app.get("/rendizy-server/make-server-67caf26a/auth/me", handleAuthMe);

// ============================================================================
// FINANCIAL MODULE ROUTES
// ============================================================================

// ✅ ARQUITETURA SQL: Rota de autenticação sem make-server-67caf26a
// ✅ DEBUG: Log antes de registrar rota
app.use("/rendizy-server/auth/*", async (c, next) => {
  console.log("🔍 [index.ts] Interceptando requisição para:", c.req.path);
  console.log("🔍 [index.ts] URL completa:", c.req.url);
  console.log("🔍 [index.ts] Method:", c.req.method);
  console.log("🔍 [index.ts] Headers:", {
    "X-Auth-Token": c.req.header("X-Auth-Token")
      ? "present (" +
        (c.req.header("X-Auth-Token")?.substring(0, 20) || "") +
        "...)"
      : "missing",
    Authorization: c.req.header("Authorization") ? "present" : "missing",
    apikey: c.req.header("apikey") ? "present" : "missing",
  });
  await next();
});

// ============================================================================
// AUTH ROUTES (CRITICAL - Login & Session)
// ============================================================================
app.route("/rendizy-server/make-server-67caf26a/auth", authApp);
app.route("/rendizy-server/auth", authApp); // Compatibility

// ============================================================================
// LOCATIONS ROUTES
// ============================================================================
// 🔄 COMPATIBILIDADE v1.0.103.xxx
// Mantém rotas antigas com hash (/make-server-67caf26a) e adiciona espelhos
// sem hash para alinhar com o frontend (`utils/api.ts` → /locations).

// Rotas antigas (com hash)
app.get(
  "/rendizy-server/make-server-67caf26a/locations",
  locationsRoutes.listLocations
);
app.get(
  "/rendizy-server/make-server-67caf26a/locations/:id",
  locationsRoutes.getLocation
);
app.post(
  "/rendizy-server/make-server-67caf26a/locations",
  locationsRoutes.createLocation
);
app.put(
  "/rendizy-server/make-server-67caf26a/locations/:id",
  locationsRoutes.updateLocation
);
app.delete(
  "/rendizy-server/make-server-67caf26a/locations/:id",
  locationsRoutes.deleteLocation
);
app.get(
  "/rendizy-server/make-server-67caf26a/locations/:id/accommodations",
  locationsRoutes.getLocationAccommodations
);

// ✅ Novas rotas sem hash (usadas pelo frontend atual)
app.get("/rendizy-server/locations", locationsRoutes.listLocations);
app.get("/rendizy-server/locations/:id", locationsRoutes.getLocation);
app.post("/rendizy-server/locations", locationsRoutes.createLocation);
app.put("/rendizy-server/locations/:id", locationsRoutes.updateLocation);
app.delete("/rendizy-server/locations/:id", locationsRoutes.deleteLocation);
app.get(
  "/rendizy-server/locations/:id/accommodations",
  locationsRoutes.getLocationAccommodations
);

// ============================================================================
// PROPERTIES/ACCOMMODATIONS ROUTES
// ✅ MELHORIA v1.0.103.400 - Aplicado tenancyMiddleware (Passo 2)
// ============================================================================

// ✅ Middleware de autenticação para todas as rotas de properties
app.use("/rendizy-server/make-server-67caf26a/properties/*", tenancyMiddleware);
// ✅ Novas rotas sem hash também protegidas
app.use("/rendizy-server/properties/*", tenancyMiddleware);

// ❌ DEPRECADO v1.0.103.406 - Rotas antigas (com hash) do wizard properties
// app.get("/rendizy-server/make-server-67caf26a/properties", propertiesRoutes.listProperties);
// app.get("/rendizy-server/make-server-67caf26a/properties/:id", propertiesRoutes.getProperty);
// app.post("/rendizy-server/make-server-67caf26a/properties", propertiesRoutes.createProperty);
// app.put("/rendizy-server/make-server-67caf26a/properties/:id", propertiesRoutes.updateProperty);
// app.delete("/rendizy-server/make-server-67caf26a/properties/:id", propertiesRoutes.deleteProperty);
// app.get("/rendizy-server/make-server-67caf26a/properties/:id/stats", propertiesRoutes.getPropertyStats);

// ❌ DEPRECADO v1.0.103.406 - Rotas antigas do wizard properties (migrado para anuncios_drafts)
// app.get("/rendizy-server/make-server-67caf26a/properties/:id", propertiesRoutes.getProperty);
// app.post("/rendizy-server/make-server-67caf26a/properties/:id", propertiesRoutes.createProperty);
// app.put("/rendizy-server/make-server-67caf26a/properties/:id", propertiesRoutes.updateProperty);
// app.delete("/rendizy-server/make-server-67caf26a/properties/:id", propertiesRoutes.deleteProperty);
// app.get("/rendizy-server/make-server-67caf26a/properties/:id/stats", propertiesRoutes.getPropertyStats);
// app.get("/rendizy-server/make-server-67caf26a/properties/:id/listings", propertiesRoutes.getPropertyListings);

// ❌ DEPRECADO v1.0.103.406 - Rotas sem hash (migrado para anuncios_drafts)
// app.get("/rendizy-server/properties", propertiesRoutes.listProperties);
// app.get("/rendizy-server/properties/:id", propertiesRoutes.getProperty);
// app.post("/rendizy-server/properties", propertiesRoutes.createProperty);
// app.put("/rendizy-server/properties/:id", propertiesRoutes.updateProperty);
// app.delete("/rendizy-server/properties/:id", propertiesRoutes.deleteProperty);
// app.get("/rendizy-server/properties/:id/stats", propertiesRoutes.getPropertyStats);
// app.get("/rendizy-server/properties/:id/listings", propertiesRoutes.getPropertyListings);

// ============================================================================
// AMENITIES ROUTES (v1.0.103.80)
// Gerenciamento de Location Amenities vs Listing Amenities
// ============================================================================

// Rotas antigas (com hash)
app.get(
  "/rendizy-server/make-server-67caf26a/properties/:id/amenities",
  amenitiesRoutes.getPropertyAmenities
);
app.put(
  "/rendizy-server/make-server-67caf26a/properties/:id/location-amenities",
  amenitiesRoutes.updateLocationAmenities
);
app.put(
  "/rendizy-server/make-server-67caf26a/properties/:id/listing-amenities",
  amenitiesRoutes.updateListingAmenities
);

// ✅ Novas rotas sem hash
app.get(
  "/rendizy-server/properties/:id/amenities",
  amenitiesRoutes.getPropertyAmenities
);
app.put(
  "/rendizy-server/properties/:id/location-amenities",
  amenitiesRoutes.updateLocationAmenities
);
app.put(
  "/rendizy-server/properties/:id/listing-amenities",
  amenitiesRoutes.updateListingAmenities
);

// ============================================================================
// RESERVATIONS ROUTES
// ✅ MELHORIA v1.0.103.400 - Aplicado tenancyMiddleware (Prompt 4)
// ============================================================================

// ✅ Middleware de autenticação para todas as rotas de reservations
app.use(
  "/rendizy-server/make-server-67caf26a/reservations/*",
  tenancyMiddleware
);
// ✅ Novas rotas sem hash também protegidas
app.use("/rendizy-server/reservations/*", tenancyMiddleware);

// Rotas antigas (com hash)
app.get(
  "/rendizy-server/make-server-67caf26a/reservations",
  reservationsRoutes.listReservations
);
app.get(
  "/rendizy-server/make-server-67caf26a/reservations/:id",
  reservationsRoutes.getReservation
);
app.post(
  "/rendizy-server/make-server-67caf26a/reservations",
  reservationsRoutes.createReservation
);
app.put(
  "/rendizy-server/make-server-67caf26a/reservations/:id",
  reservationsRoutes.updateReservation
);
app.delete(
  "/rendizy-server/make-server-67caf26a/reservations/:id",
  reservationsRoutes.deleteReservation
);
app.post(
  "/rendizy-server/make-server-67caf26a/reservations/:id/cancel",
  reservationsRoutes.cancelReservation
);
app.post(
  "/rendizy-server/make-server-67caf26a/reservations/check-availability",
  reservationsRoutes.checkAvailability
);
app.get(
  "/rendizy-server/make-server-67caf26a/reservations/detect-conflicts",
  reservationsRoutes.detectConflicts
);

// ✅ Novas rotas sem hash (usadas por `utils/api.ts` → `/reservations`)
// ⚠️ ORDEM IMPORTANTE: Rotas específicas ANTES das genéricas
app.post(
  "/rendizy-server/reservations/check-availability",
  reservationsRoutes.checkAvailability
);
app.get(
  "/rendizy-server/reservations/detect-conflicts",
  reservationsRoutes.detectConflicts
);
app.post(
  "/rendizy-server/reservations/:id/cancel",
  reservationsRoutes.cancelReservation
);
app.get("/rendizy-server/reservations", reservationsRoutes.listReservations);
app.get("/rendizy-server/reservations/:id", reservationsRoutes.getReservation);
app.post("/rendizy-server/reservations", reservationsRoutes.createReservation);
app.put(
  "/rendizy-server/reservations/:id",
  reservationsRoutes.updateReservation
);
app.delete(
  "/rendizy-server/reservations/:id",
  reservationsRoutes.deleteReservation
);

// ============================================================================
// GUESTS ROUTES
// ✅ MELHORIA v1.0.103.400 - Aplicado tenancyMiddleware (Prompt 4)
// ============================================================================

// ✅ Middleware de autenticação para todas as rotas de guests
app.use("/rendizy-server/make-server-67caf26a/guests/*", tenancyMiddleware);
// ✅ Novas rotas sem hash também protegidas
app.use("/rendizy-server/guests/*", tenancyMiddleware);

// Rotas antigas (com hash)
app.get("/rendizy-server/make-server-67caf26a/guests", guestsRoutes.listGuests);
app.get(
  "/rendizy-server/make-server-67caf26a/guests/:id",
  guestsRoutes.getGuest
);
app.post(
  "/rendizy-server/make-server-67caf26a/guests",
  guestsRoutes.createGuest
);
app.put(
  "/rendizy-server/make-server-67caf26a/guests/:id",
  guestsRoutes.updateGuest
);
app.delete(
  "/rendizy-server/make-server-67caf26a/guests/:id",
  guestsRoutes.deleteGuest
);
app.get(
  "/rendizy-server/make-server-67caf26a/guests/:id/history",
  guestsRoutes.getGuestHistory
);
app.post(
  "/rendizy-server/make-server-67caf26a/guests/:id/blacklist",
  guestsRoutes.toggleBlacklist
);

// ✅ Novas rotas sem hash (usadas por `utils/api.ts` → `/guests`)
app.get("/rendizy-server/guests", guestsRoutes.listGuests);
app.get("/rendizy-server/guests/:id", guestsRoutes.getGuest);
app.post("/rendizy-server/guests", guestsRoutes.createGuest);
app.put("/rendizy-server/guests/:id", guestsRoutes.updateGuest);
app.delete("/rendizy-server/guests/:id", guestsRoutes.deleteGuest);
app.get("/rendizy-server/guests/:id/history", guestsRoutes.getGuestHistory);
app.post("/rendizy-server/guests/:id/blacklist", guestsRoutes.toggleBlacklist);

// ============================================================================
// CALENDAR ROUTES
// ✅ MELHORIA v1.0.103.400 - Aplicado tenancyMiddleware (Prompt 4)
// ============================================================================

// ✅ Middleware de autenticação para todas as rotas de calendar
app.use("/rendizy-server/make-server-67caf26a/calendar/*", tenancyMiddleware);
// ✅ Novas rotas sem hash também protegidas
app.use("/rendizy-server/calendar/*", tenancyMiddleware);
app.use("/rendizy-server/calendar/*", tenancyMiddleware);

// Rotas antigas (com hash)
app.get(
  "/rendizy-server/make-server-67caf26a/calendar",
  calendarRoutes.getCalendarData
);
app.get(
  "/rendizy-server/make-server-67caf26a/calendar/stats",
  calendarRoutes.getCalendarStats
);
app.post(
  "/rendizy-server/make-server-67caf26a/calendar/blocks",
  calendarRoutes.createBlock
);
app.delete(
  "/rendizy-server/make-server-67caf26a/calendar/blocks/:id",
  calendarRoutes.deleteBlock
);
app.post(
  "/rendizy-server/make-server-67caf26a/calendar/bulk-update-prices",
  calendarRoutes.bulkUpdatePrices
);
app.post(
  "/rendizy-server/make-server-67caf26a/calendar/bulk-update-min-nights",
  calendarRoutes.bulkUpdateMinNights
);
app.post(
  "/rendizy-server/make-server-67caf26a/calendar/delete-custom-prices",
  calendarRoutes.deleteCustomPrices
);

// ✅ Novas rotas sem hash (usadas por `utils/api.ts` → `/calendar`)
app.get("/rendizy-server/calendar", calendarRoutes.getCalendarData);
app.get("/rendizy-server/calendar/stats", calendarRoutes.getCalendarStats);
app.post("/rendizy-server/calendar/blocks", calendarRoutes.createBlock);
app.delete("/rendizy-server/calendar/blocks/:id", calendarRoutes.deleteBlock);
app.post(
  "/rendizy-server/calendar/bulk-update-prices",
  calendarRoutes.bulkUpdatePrices
);
app.post(
  "/rendizy-server/calendar/bulk-update-min-nights",
  calendarRoutes.bulkUpdateMinNights
);
app.post(
  "/rendizy-server/calendar/delete-custom-prices",
  calendarRoutes.deleteCustomPrices
);

// ============================================================================
// PHOTOS ROUTES
// ============================================================================

// Rotas antigas (com hash)
app.post(
  "/rendizy-server/make-server-67caf26a/photos",
  photosRoutes.uploadPhotoBase64
); // Base64 upload (for FigmaTestPropertyCreator)
app.post(
  "/rendizy-server/make-server-67caf26a/photos/upload",
  photosRoutes.uploadPhoto
); // FormData upload (for PhotoManager)
app.put(
  "/rendizy-server/make-server-67caf26a/photos/:photoId",
  photosRoutes.updatePhoto
); // Update photo metadata
app.delete(
  "/rendizy-server/make-server-67caf26a/photos/:path",
  photosRoutes.deletePhoto
);
app.get(
  "/rendizy-server/make-server-67caf26a/photos/property/:propertyId",
  photosRoutes.listPropertyPhotos
);

// ✅ Novas rotas sem hash (usadas por `photosApi` → `/photos/...`)
app.post("/rendizy-server/photos", photosRoutes.uploadPhotoBase64);
app.post("/rendizy-server/photos/upload", photosRoutes.uploadPhoto);
app.put("/rendizy-server/photos/:photoId", photosRoutes.updatePhoto);
app.delete("/rendizy-server/photos/:path", photosRoutes.deletePhoto);
app.get(
  "/rendizy-server/photos/property/:propertyId",
  photosRoutes.listPropertyPhotos
);

// ============================================================================
// ORGANIZATIONS ROUTES
// ============================================================================

// ✅ CORRIGIDO: Registrar rotas diretamente (como locationsRoutes) para garantir funcionamento
// Rotas antigas (com hash)
// ⚠️ IMPORTANTE: Ordem das rotas - rotas específicas ANTES de genéricas
app.get(
  "/rendizy-server/make-server-67caf26a/organizations",
  organizationsRoutes.listOrganizations
);
app.get(
  "/rendizy-server/make-server-67caf26a/organizations/slug/:slug",
  organizationsRoutes.getOrganizationBySlug
); // ✅ ANTES de /:id
app.get(
  "/rendizy-server/make-server-67caf26a/organizations/:id/settings/global",
  organizationsRoutes.getOrganizationSettings
); // ✅ ANTES de /:id
app.get(
  "/rendizy-server/make-server-67caf26a/organizations/:id/stats",
  organizationsRoutes.getOrganizationStats
); // ✅ ANTES de /:id
app.get(
  "/rendizy-server/make-server-67caf26a/organizations/:id",
  organizationsRoutes.getOrganization
); // ✅ GENÉRICA por último
app.post(
  "/rendizy-server/make-server-67caf26a/organizations",
  organizationsRoutes.createOrganization
);
app.patch(
  "/rendizy-server/make-server-67caf26a/organizations/:id",
  organizationsRoutes.updateOrganization
);
app.delete(
  "/rendizy-server/make-server-67caf26a/organizations/:id",
  organizationsRoutes.deleteOrganization
);
app.put(
  "/rendizy-server/make-server-67caf26a/organizations/:id/settings/global",
  organizationsRoutes.updateOrganizationSettings
);

// ✅ Novas rotas sem hash (usadas pelo frontend atual)
// ⚠️ IMPORTANTE: Ordem das rotas - rotas específicas ANTES de genéricas
app.get("/rendizy-server/organizations", organizationsRoutes.listOrganizations);
app.get(
  "/rendizy-server/organizations/slug/:slug",
  organizationsRoutes.getOrganizationBySlug
); // ✅ ANTES de /:id
app.get(
  "/rendizy-server/organizations/:id/settings/global",
  organizationsRoutes.getOrganizationSettings
); // ✅ ANTES de /:id
app.get(
  "/rendizy-server/organizations/:id/stats",
  organizationsRoutes.getOrganizationStats
); // ✅ ANTES de /:id
app.get(
  "/rendizy-server/organizations/:id",
  organizationsRoutes.getOrganization
); // ✅ GENÉRICA por último
app.post(
  "/rendizy-server/organizations",
  organizationsRoutes.createOrganization
);
app.patch(
  "/rendizy-server/organizations/:id",
  organizationsRoutes.updateOrganization
);
app.delete(
  "/rendizy-server/organizations/:id",
  organizationsRoutes.deleteOrganization
);
app.put(
  "/rendizy-server/organizations/:id/settings/global",
  organizationsRoutes.updateOrganizationSettings
);

// ============================================================================
// USERS ROUTES
// ============================================================================

app.route("/rendizy-server/make-server-67caf26a/users", usersApp);

// ============================================================================
// BOOKING.COM INTEGRATION ROUTES
// ============================================================================

app.route("/rendizy-server/make-server-67caf26a/bookingcom", bookingcomRoutes);

// ============================================================================
// LISTINGS ROUTES
// ============================================================================

app.route("/rendizy-server/make-server-67caf26a/listings", listingsApp);

// ============================================================================
// ROOMS ROUTES (v1.0.79)
// ============================================================================

app.route("/rendizy-server/make-server-67caf26a", roomsApp);

// ============================================================================
// ACCOMMODATION RULES ROUTES (v1.0.80)
// ============================================================================

app.route("/rendizy-server/make-server-67caf26a", rulesApp);

// ============================================================================
// PRICING SETTINGS ROUTES (v1.0.81)
// ============================================================================

app.route("/rendizy-server/make-server-67caf26a", pricingSettingsApp);

// ============================================================================
// SEASONAL PRICING ROUTES (v1.0.103.88)
// ============================================================================

app.route("/rendizy-server/make-server-67caf26a", seasonalPricingApp);

// ============================================================================
// ICAL SYNCHRONIZATION ROUTES (v1.0.83)
// ============================================================================

app.route("/rendizy-server/make-server-67caf26a", icalApp);

// ============================================================================
// SETTINGS ROUTES (Global vs Individual) (v1.0.84)
// ============================================================================

app.route("/rendizy-server/make-server-67caf26a", settingsApp);

// ============================================================================
// BULK PRICING ROUTES (v1.0.85)
// ============================================================================

app.route("/rendizy-server/make-server-67caf26a", bulkPricingApp);

// ============================================================================
// ⚠️ CHAT ROUTES (v1.0.93) - FUNCIONALIDADE CRÍTICA
// ✅ REABILITADO v1.0.103.87 - Necessário para canais de comunicação
//
// ⚠️ ATENÇÃO: Estas rotas incluem WhatsApp Integration em produção
// ⚠️ NÃO REMOVER sem verificar FUNCIONALIDADES_CRITICAS.md
// ============================================================================

// TODO: Corrigir export default em routes-chat.ts
// // TODO: Corrigir export default em routes-chat.ts
// app.route("/rendizy-server/make-server-67caf26a/chat", chatApp);
// ✅ Nova rota sem hash (usada pelo frontend atual - channelsApi)
// // app.route("/rendizy-server/chat", chatApp);

// ============================================================================
// WHATSAPP EVOLUTION API ROUTES (v1.0.103.84)
// Integração Evolution API com proxy seguro
// ============================================================================

whatsappEvolutionRoutes(app);

// ============================================================================
// WHATSAPP DATA MANAGEMENT ROUTES (v1.0.103.265)
// Gerenciamento de dados WhatsApp no KV Store
// ============================================================================

whatsappDataRoutes(app);

// ============================================================================
// QUOTATIONS ROUTES (v1.0.90)
// ============================================================================

app.route("/rendizy-server/make-server-67caf26a/quotations", quotationsApp);

// ============================================================================
// BLOCKS ROUTES (v1.0.90)
// ============================================================================

app.route("/rendizy-server/make-server-67caf26a/blocks", blocksApp);

// ============================================================================
// PROPERTY TYPES ROUTES (v1.0.103.8)
// ============================================================================

app.route(
  "/rendizy-server/make-server-67caf26a/property-types",
  propertyTypesApp
);
// ✅ Nova rota sem hash (usada pelo frontend atual)
app.route("/rendizy-server/property-types", propertyTypesApp);

// ============================================================================
// PROPERTY WIZARD ROUTES (v1.0.103.111)
// Backend completo para os 7 passos do wizard de edição
// ============================================================================

app.route(
  "/rendizy-server/make-server-67caf26a/properties/wizard",
  propertyWizardApp
);
// ✅ Nova rota sem hash (para uso futuro no frontend)
app.route("/rendizy-server/properties/wizard", propertyWizardApp);

// ============================================================================
// LOCATION AMENITIES ROUTES (v1.0.103.11)
// ============================================================================

app.get(
  "/rendizy-server/make-server-67caf26a/settings/location-amenities",
  locationAmenitiesRoutes.getLocationAmenitiesConfig
);
app.put(
  "/rendizy-server/make-server-67caf26a/settings/location-amenities",
  locationAmenitiesRoutes.updateLocationAmenitiesConfig
);
app.post(
  "/rendizy-server/make-server-67caf26a/settings/location-amenities/reset",
  locationAmenitiesRoutes.resetLocationAmenitiesConfig
);
app.get(
  "/rendizy-server/make-server-67caf26a/settings/location-amenities/enabled",
  locationAmenitiesRoutes.getEnabledAmenitiesForLocation
);
// ✅ Novas rotas sem hash
app.get(
  "/rendizy-server/settings/location-amenities",
  locationAmenitiesRoutes.getLocationAmenitiesConfig
);
app.put(
  "/rendizy-server/settings/location-amenities",
  locationAmenitiesRoutes.updateLocationAmenitiesConfig
);
app.post(
  "/rendizy-server/settings/location-amenities/reset",
  locationAmenitiesRoutes.resetLocationAmenitiesConfig
);
app.get(
  "/rendizy-server/settings/location-amenities/enabled",
  locationAmenitiesRoutes.getEnabledAmenitiesForLocation
);

// ============================================================================
// AI PROVIDER CONFIG ROUTES (v1.0.103.500)
// ============================================================================
// ✅ Middleware de autenticação para todas as rotas de AI
app.use(
  "/rendizy-server/make-server-67caf26a/integrations/ai/*",
  tenancyMiddleware
);
app.use("/rendizy-server/integrations/ai/*", tenancyMiddleware); // Rotas espelho

// Rotas antigas (com hash)
app.get(
  "/rendizy-server/make-server-67caf26a/integrations/ai/config",
  aiRoutes.getAIProviderConfig
);
app.get(
  "/rendizy-server/make-server-67caf26a/integrations/ai/configs",
  aiRoutes.listAIProviderConfigs
);
app.put(
  "/rendizy-server/make-server-67caf26a/integrations/ai/config",
  aiRoutes.upsertAIProviderConfig
);
app.patch(
  "/rendizy-server/make-server-67caf26a/integrations/ai/config/:id/status",
  aiRoutes.toggleAIConfigStatus
);
app.delete(
  "/rendizy-server/make-server-67caf26a/integrations/ai/config/:id",
  aiRoutes.deleteAIProviderConfig
);
app.post(
  "/rendizy-server/make-server-67caf26a/integrations/ai/test",
  aiRoutes.testAIProviderConfig
);

// Rotas espelho (sem hash)
app.get("/rendizy-server/integrations/ai/config", aiRoutes.getAIProviderConfig);
app.get(
  "/rendizy-server/integrations/ai/configs",
  aiRoutes.listAIProviderConfigs
);
app.put(
  "/rendizy-server/integrations/ai/config",
  aiRoutes.upsertAIProviderConfig
);
app.patch(
  "/rendizy-server/integrations/ai/config/:id/status",
  aiRoutes.toggleAIConfigStatus
);
app.delete(
  "/rendizy-server/integrations/ai/config/:id",
  aiRoutes.deleteAIProviderConfig
);
app.post("/rendizy-server/integrations/ai/test", aiRoutes.testAIProviderConfig);

// ============================================================================
// AUTOMATIONS AI ROUTES (v1.0.103.501)
// ============================================================================
app.use(
  "/rendizy-server/make-server-67caf26a/automations/ai/*",
  tenancyMiddleware
);
app.use("/rendizy-server/automations/ai/*", tenancyMiddleware); // Rotas espelho

// Automações - garantir multi-tenancy em todas as rotas (base e subrotas)
app.use("/rendizy-server/make-server-67caf26a/automations", tenancyMiddleware);
app.use(
  "/rendizy-server/make-server-67caf26a/automations/*",
  tenancyMiddleware
);
app.use("/rendizy-server/automations", tenancyMiddleware);
app.use("/rendizy-server/automations/*", tenancyMiddleware);

app.post(
  "/rendizy-server/make-server-67caf26a/automations/ai/interpret",
  automationsAIRoutes.interpretAutomationNaturalLanguage
);
app.post(
  "/rendizy-server/automations/ai/interpret",
  automationsAIRoutes.interpretAutomationNaturalLanguage
);

// AUTOMATIONS CRUD ROUTES (v1.0.103.502)
// ============================================================================
app.get(
  "/rendizy-server/make-server-67caf26a/automations",
  automationsRoutes.listAutomations
);
app.get("/rendizy-server/automations", automationsRoutes.listAutomations);
app.get(
  "/rendizy-server/make-server-67caf26a/automations/:id",
  automationsRoutes.getAutomation
);
app.get("/rendizy-server/automations/:id", automationsRoutes.getAutomation);
app.post(
  "/rendizy-server/make-server-67caf26a/automations",
  automationsRoutes.createAutomation
);
app.post("/rendizy-server/automations", automationsRoutes.createAutomation);
app.put(
  "/rendizy-server/make-server-67caf26a/automations/:id",
  automationsRoutes.updateAutomation
);
app.put("/rendizy-server/automations/:id", automationsRoutes.updateAutomation);
app.delete(
  "/rendizy-server/make-server-67caf26a/automations/:id",
  automationsRoutes.deleteAutomation
);
app.delete(
  "/rendizy-server/automations/:id",
  automationsRoutes.deleteAutomation
);
app.patch(
  "/rendizy-server/make-server-67caf26a/automations/:id/status",
  automationsRoutes.updateAutomationStatus
);
app.patch(
  "/rendizy-server/automations/:id/status",
  automationsRoutes.updateAutomationStatus
);
app.get(
  "/rendizy-server/make-server-67caf26a/automations/:id/executions",
  automationsRoutes.getAutomationExecutions
);
app.get(
  "/rendizy-server/automations/:id/executions",
  automationsRoutes.getAutomationExecutions
);

// ============================================================================
// CRM DEALS ROUTES (v1.0.103.600)
// ============================================================================

// ✅ Middleware de autenticação para todas as rotas de deals
app.use("/rendizy-server/make-server-67caf26a/crm/deals/*", tenancyMiddleware);
app.use("/rendizy-server/crm/deals/*", tenancyMiddleware);

// Deals CRUD
app.get(
  "/rendizy-server/make-server-67caf26a/crm/deals",
  dealsRoutes.listDeals
);
app.get("/rendizy-server/crm/deals", dealsRoutes.listDeals);
app.get(
  "/rendizy-server/make-server-67caf26a/crm/deals/:id",
  dealsRoutes.getDeal
);
app.get("/rendizy-server/crm/deals/:id", dealsRoutes.getDeal);
app.post(
  "/rendizy-server/make-server-67caf26a/crm/deals",
  dealsRoutes.createDeal
);
app.post("/rendizy-server/crm/deals", dealsRoutes.createDeal);
app.put(
  "/rendizy-server/make-server-67caf26a/crm/deals/:id",
  dealsRoutes.updateDeal
);
app.put("/rendizy-server/crm/deals/:id", dealsRoutes.updateDeal);
app.patch(
  "/rendizy-server/make-server-67caf26a/crm/deals/:id/stage",
  dealsRoutes.updateDealStage
);
app.patch("/rendizy-server/crm/deals/:id/stage", dealsRoutes.updateDealStage);
app.delete(
  "/rendizy-server/make-server-67caf26a/crm/deals/:id",
  dealsRoutes.deleteDeal
);
app.delete("/rendizy-server/crm/deals/:id", dealsRoutes.deleteDeal);

// Deal Activities
app.get(
  "/rendizy-server/make-server-67caf26a/crm/deals/:id/activities",
  dealsRoutes.listDealActivities
);
app.get(
  "/rendizy-server/crm/deals/:id/activities",
  dealsRoutes.listDealActivities
);
app.post(
  "/rendizy-server/make-server-67caf26a/crm/deals/:id/activities",
  dealsRoutes.createDealActivity
);
app.post(
  "/rendizy-server/crm/deals/:id/activities",
  dealsRoutes.createDealActivity
);

// Deal Messages
app.get(
  "/rendizy-server/make-server-67caf26a/crm/deals/:id/messages",
  dealsRoutes.listDealMessages
);
app.get("/rendizy-server/crm/deals/:id/messages", dealsRoutes.listDealMessages);
app.post(
  "/rendizy-server/make-server-67caf26a/crm/deals/:id/messages",
  dealsRoutes.sendDealMessage
);
app.post("/rendizy-server/crm/deals/:id/messages", dealsRoutes.sendDealMessage);

// ============================================================================
// SERVICES TICKETS ROUTES (v1.0.103.700)
// ============================================================================

// ✅ Middleware de autenticação para todas as rotas de services tickets
app.use(
  "/rendizy-server/make-server-67caf26a/crm/services/*",
  tenancyMiddleware
);
app.use("/rendizy-server/crm/services/*", tenancyMiddleware);

// Tickets CRUD
app.get(
  "/rendizy-server/make-server-67caf26a/crm/services/tickets",
  servicesTicketsRoutes.listServiceTickets
);
app.get(
  "/rendizy-server/crm/services/tickets",
  servicesTicketsRoutes.listServiceTickets
);
app.get(
  "/rendizy-server/make-server-67caf26a/crm/services/tickets/:id",
  servicesTicketsRoutes.getServiceTicket
);
app.get(
  "/rendizy-server/crm/services/tickets/:id",
  servicesTicketsRoutes.getServiceTicket
);
app.post(
  "/rendizy-server/make-server-67caf26a/crm/services/tickets",
  servicesTicketsRoutes.createServiceTicket
);
app.post(
  "/rendizy-server/crm/services/tickets",
  servicesTicketsRoutes.createServiceTicket
);
app.put(
  "/rendizy-server/make-server-67caf26a/crm/services/tickets/:id",
  servicesTicketsRoutes.updateServiceTicket
);
app.put(
  "/rendizy-server/crm/services/tickets/:id",
  servicesTicketsRoutes.updateServiceTicket
);
app.patch(
  "/rendizy-server/make-server-67caf26a/crm/services/tickets/:id/stage",
  servicesTicketsRoutes.updateServiceTicketStage
);
app.patch(
  "/rendizy-server/crm/services/tickets/:id/stage",
  servicesTicketsRoutes.updateServiceTicketStage
);
app.delete(
  "/rendizy-server/make-server-67caf26a/crm/services/tickets/:id",
  servicesTicketsRoutes.deleteServiceTicket
);
app.delete(
  "/rendizy-server/crm/services/tickets/:id",
  servicesTicketsRoutes.deleteServiceTicket
);

// Tasks
app.post(
  "/rendizy-server/make-server-67caf26a/crm/services/tickets/:id/tasks",
  servicesTicketsRoutes.createServiceTask
);
app.post(
  "/rendizy-server/crm/services/tickets/:id/tasks",
  servicesTicketsRoutes.createServiceTask
);
app.put(
  "/rendizy-server/make-server-67caf26a/crm/services/tickets/:id/tasks/:taskId",
  servicesTicketsRoutes.updateServiceTask
);
app.put(
  "/rendizy-server/crm/services/tickets/:id/tasks/:taskId",
  servicesTicketsRoutes.updateServiceTask
);
app.delete(
  "/rendizy-server/make-server-67caf26a/crm/services/tickets/:id/tasks/:taskId",
  servicesTicketsRoutes.deleteServiceTask
);
app.delete(
  "/rendizy-server/crm/services/tickets/:id/tasks/:taskId",
  servicesTicketsRoutes.deleteServiceTask
);

// Templates CRUD
app.get(
  "/rendizy-server/make-server-67caf26a/crm/services/templates",
  serviceTemplatesRoutes.listServiceTemplates
);
app.get(
  "/rendizy-server/crm/services/templates",
  serviceTemplatesRoutes.listServiceTemplates
);
app.get(
  "/rendizy-server/make-server-67caf26a/crm/services/templates/:id",
  serviceTemplatesRoutes.getServiceTemplate
);
app.get(
  "/rendizy-server/crm/services/templates/:id",
  serviceTemplatesRoutes.getServiceTemplate
);
app.post(
  "/rendizy-server/make-server-67caf26a/crm/services/templates",
  serviceTemplatesRoutes.createServiceTemplate
);
app.post(
  "/rendizy-server/crm/services/templates",
  serviceTemplatesRoutes.createServiceTemplate
);
app.put(
  "/rendizy-server/make-server-67caf26a/crm/services/templates/:id",
  serviceTemplatesRoutes.updateServiceTemplate
);
app.put(
  "/rendizy-server/crm/services/templates/:id",
  serviceTemplatesRoutes.updateServiceTemplate
);
app.delete(
  "/rendizy-server/make-server-67caf26a/crm/services/templates/:id",
  serviceTemplatesRoutes.deleteServiceTemplate
);
app.delete(
  "/rendizy-server/crm/services/templates/:id",
  serviceTemplatesRoutes.deleteServiceTemplate
);
app.post(
  "/rendizy-server/make-server-67caf26a/crm/services/templates/:id/create-ticket",
  serviceTemplatesRoutes.createTicketFromTemplate
);
app.post(
  "/rendizy-server/crm/services/templates/:id/create-ticket",
  serviceTemplatesRoutes.createTicketFromTemplate
);

// ============================================================================
// STAYS.NET PMS INTEGRATION ROUTES (v1.0.103.17)
// ============================================================================

// ⚠️ CRÍTICO: ROTAS SEM MIDDLEWARE - NÃO ADICIONAR tenancyMiddleware
// 
// Motivo: Estas rotas usam X-Auth-Token (custom token), não JWT
// - tenancyMiddleware valida Authorization: Bearer (JWT do Supabase)
// - X-Auth-Token é validado internamente via getOrganizationIdOrThrow()
// - Adicionar middleware causa erro 401 "Invalid JWT"
// 
// Histórico: 19/12/2024 - Middleware adicionado e removido 3x causou 401
// Solução: Manter rotas sem middleware, validação interna funciona
app.get(
  "/rendizy-server/make-server-67caf26a/settings/staysnet",
  staysnetRoutes.getStaysNetConfig
);
app.post(
  "/rendizy-server/make-server-67caf26a/settings/staysnet",
  staysnetRoutes.saveStaysNetConfig
);

// ⚠️ ROTAS SEM MIDDLEWARE - Validação interna
app.post(
  "/rendizy-server/make-server-67caf26a/staysnet/test",
  staysnetRoutes.testStaysNetConnection
);
app.post(
  "/rendizy-server/make-server-67caf26a/staysnet/test-endpoint",
  staysnetRoutes.testStaysNetEndpoint
);
app.post(
  "/rendizy-server/make-server-67caf26a/staysnet/sync/properties",
  staysnetRoutes.syncStaysNetProperties
);
app.post(
  "/rendizy-server/make-server-67caf26a/staysnet/sync/reservations",
  staysnetRoutes.syncStaysNetReservations
);
app.get(
  "/rendizy-server/make-server-67caf26a/staysnet/reservations/preview",
  staysnetRoutes.previewStaysNetReservations
);
app.post(
  "/rendizy-server/make-server-67caf26a/staysnet/import/full",
  staysnetRoutes.importFullStaysNet
);

// ============================================================================
// CLIENT SITES ROUTES (v1.0.103.187)
// Sistema de gestão de sites customizados por cliente
// ============================================================================

app.route("/rendizy-server/make-server-67caf26a/client-sites", clientSitesApp);
// ✅ Nova rota espelho sem hash (usada pelo frontend atual)
app.route("/rendizy-server/client-sites", clientSitesApp);

// ============================================================================
// SHORT IDS ROUTES (v1.0.103.271)
// Sistema de IDs curtos (6 caracteres) para propriedades
// ============================================================================

app.route("/rendizy-server/make-server-67caf26a/short-ids", shortIdsApp);

// ============================================================================
// ADMIN CLEANUP ROUTES (v1.0.103.272)
// ⚠️ Rotas administrativas de limpeza - DELETE ALL PROPERTIES
// ============================================================================

app.route(
  "/rendizy-server/make-server-67caf26a/admin/cleanup",
  adminCleanupApp
);

// ============================================================================
// ORGANIZATIONS, USERS, CLIENTS & OWNERS ROUTES (v1.0.103.232)
// Sistema SaaS Multi-tenant - Gerenciamento completo
// ============================================================================

// Rotas antigas (com hash) - DUPLICADAS (já registradas acima, mas mantendo para compatibilidade)
// app.route("/rendizy-server/make-server-67caf26a/organizations", organizationsApp); // ✅ JÁ REGISTRADO ACIMA
// ✅ Rotas sem hash (usadas pelo frontend atual) - JÁ REGISTRADAS ACIMA
// app.route("/rendizy-server/organizations", organizationsApp); // ✅ JÁ REGISTRADO ACIMA

app.route("/rendizy-server/make-server-67caf26a/users", usersApp);

app.route("/rendizy-server/make-server-67caf26a/clients", clientsApp);
app.route("/rendizy-server/make-server-67caf26a/owners", ownersApp);
// ✅ MELHORIA v1.0.103.400 - Tenants Routes (Passo 3)
app.route("/rendizy-server/make-server-67caf26a/tenants", tenantsApp);

// ============================================================================
// ANÚNCIOS ULTIMATE ROUTES (v1.0.103.320)
// Sistema de anúncios com drafts, versões e publicação
// ============================================================================

app.route("/rendizy-server/anuncios-ultimate", anunciosApp);

// ============================================================================
// FINANCEIRO ROUTES (v1.0.103.400)
// ============================================================================

// ✅ Middleware de autenticação para todas as rotas financeiras
app.use("/rendizy-server/make-server-67caf26a/financeiro/*", tenancyMiddleware);
app.use(
  "/rendizy-server/make-server-67caf26a/financeiro/conciliacao/*",
  tenancyMiddleware
);

// Lançamentos
app.get("/financeiro/lancamentos", financeiroRoutes.listLancamentos);
app.get("/financeiro/lancamentos/:id", financeiroRoutes.getLancamento);
app.post("/financeiro/lancamentos", financeiroRoutes.createLancamento);
app.put("/financeiro/lancamentos/:id", financeiroRoutes.updateLancamento);
app.delete("/financeiro/lancamentos/:id", financeiroRoutes.deleteLancamento);

// Títulos
app.get("/financeiro/titulos", financeiroRoutes.listTitulos);
app.get("/financeiro/titulos/:id", financeiroRoutes.getTitulo);
app.post("/financeiro/titulos", financeiroRoutes.createTitulo);
app.put("/financeiro/titulos/:id", financeiroRoutes.updateTitulo);
app.delete("/financeiro/titulos/:id", financeiroRoutes.deleteTitulo);
app.post("/financeiro/titulos/:id/quitar", financeiroRoutes.quitarTitulo);

// Contas Bancárias
app.get("/financeiro/contas-bancarias", financeiroRoutes.listContasBancarias);
app.get("/financeiro/contas-bancarias/:id", financeiroRoutes.getContaBancaria);
app.post("/financeiro/contas-bancarias", financeiroRoutes.createContaBancaria);
app.put(
  "/financeiro/contas-bancarias/:id",
  financeiroRoutes.updateContaBancaria
);
app.delete(
  "/financeiro/contas-bancarias/:id",
  financeiroRoutes.deleteContaBancaria
);

// Categorias
app.get(
  "/rendizy-server/make-server-67caf26a/financeiro/categorias",
  financeiroRoutes.listCategorias
);
app.get(
  "/rendizy-server/make-server-67caf26a/financeiro/categorias/:id",
  financeiroRoutes.getCategoria
);
app.post(
  "/rendizy-server/make-server-67caf26a/financeiro/categorias",
  financeiroRoutes.createCategoria
);
app.put(
  "/rendizy-server/make-server-67caf26a/financeiro/categorias/:id",
  financeiroRoutes.updateCategoria
);
app.delete(
  "/rendizy-server/make-server-67caf26a/financeiro/categorias/:id",
  financeiroRoutes.deleteCategoria
);

// Mapeamento de Campos do Sistema para Plano de Contas
app.get(
  "/rendizy-server/make-server-67caf26a/financeiro/campo-mappings",
  financeiroRoutes.listCampoMappings
);
app.post(
  "/rendizy-server/make-server-67caf26a/financeiro/campo-mappings",
  financeiroRoutes.createCampoMapping
);
app.put(
  "/rendizy-server/make-server-67caf26a/financeiro/campo-mappings/:id",
  financeiroRoutes.updateCampoMapping
);
app.delete(
  "/rendizy-server/make-server-67caf26a/financeiro/campo-mappings/:id",
  financeiroRoutes.deleteCampoMapping
);
// Registrar campo financeiro do sistema (para módulos)
app.post(
  "/rendizy-server/make-server-67caf26a/financeiro/campo-mappings/register",
  financeiroRoutes.registerFinancialField
);

// Centro de Custos
app.get("/financeiro/centro-custos", financeiroRoutes.listCentroCustos);
app.get("/financeiro/centro-custos/:id", financeiroRoutes.getCentroCusto);
app.post("/financeiro/centro-custos", financeiroRoutes.createCentroCusto);
app.put("/financeiro/centro-custos/:id", financeiroRoutes.updateCentroCusto);
app.delete("/financeiro/centro-custos/:id", financeiroRoutes.deleteCentroCusto);

// ============================================================================
// CONCILIAÇÃO BANCÁRIA
// ============================================================================

// Importar extrato
app.post("/financeiro/conciliacao/importar", conciliacaoRoutes.importarExtrato);

// Linhas de extrato
app.get("/financeiro/conciliacao/pendentes", conciliacaoRoutes.listarPendentes);

// Conciliação
app.post("/financeiro/conciliacao/match", conciliacaoRoutes.conciliarLinha);
app.post(
  "/financeiro/conciliacao/aplicar-regras",
  conciliacaoRoutes.aplicarRegras
);

// Fechamento de caixa
app.get(
  "/financeiro/conciliacao/fechamento",
  conciliacaoRoutes.fechamentoCaixa
);

// Regras de conciliação
app.get("/financeiro/conciliacao/regras", conciliacaoRoutes.listarRegras);
app.post("/financeiro/conciliacao/regras", conciliacaoRoutes.criarRegra);
app.put("/financeiro/conciliacao/regras/:id", conciliacaoRoutes.atualizarRegra);
app.delete(
  "/financeiro/conciliacao/regras/:id",
  conciliacaoRoutes.deletarRegra
);

// ============================================================================
// DATABASE RESET ROUTES (v1.0.103.267)
// ⚠️ Sistema de reset do banco de dados - USAR COM CUIDADO
// ============================================================================

app.route("/rendizy-server/make-server-67caf26a/reset", resetRoutes);

// ============================================================================
// DEVELOPMENT / TESTING ROUTES
// ============================================================================

// Seed database with sample data (OLD STRUCTURE - compatibilidade)
app.post(
  "/rendizy-server/make-server-67caf26a/dev/seed-database",
  async (c) => {
    try {
      console.log("🌱 Starting database seed (OLD STRUCTURE)...");
      const result = await seedDatabase();

      return c.json({
        success: true,
        message: "Database seeded successfully (old structure)",
        data: {
          propertiesCount: result.properties.length,
          guestsCount: result.guests.length,
          reservationsCount: result.reservations.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error seeding database:", error);
      return c.json(
        {
          success: false,
          error: "Failed to seed database",
          message: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  }
);

// Seed database with NEW STRUCTURE (Location → Accommodation)
app.post(
  "/rendizy-server/make-server-67caf26a/dev/seed-database-new",
  async (c) => {
    try {
      console.log(
        "🌱 Starting database seed (NEW STRUCTURE: Location → Accommodation)..."
      );
      const result = await seedDatabaseNew();

      return c.json({
        success: true,
        message: "Database seeded successfully with NEW STRUCTURE",
        structure: "Location → Accommodation",
        data: {
          locationsCount: result.locations.length,
          accommodationsCount: result.accommodations.length,
          guestsCount: result.guests.length,
          reservationsCount: result.reservations.length,
          linkedAccommodations: result.accommodations.filter(
            (a) => a.locationId
          ).length,
          standaloneAccommodations: result.accommodations.filter(
            (a) => !a.locationId
          ).length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error seeding database:", error);
      return c.json(
        {
          success: false,
          error: "Failed to seed database",
          message: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  }
);

// 🆕 v1.0.103.315 - Migração de Normalização de Propriedades
app.post(
  "/rendizy-server/make-server-67caf26a/migrate-normalize-properties",
  migrateNormalizeProperties
);

// ✅ MELHORIA v1.0.103.400 - Migração Property.platforms → Listings
// ⚠️ ROTA TEMPORÁRIA - Remover após migração em produção
app.post(
  "/rendizy-server/make-server-67caf26a/migrate/properties-to-listings",
  migratePropertiesToListingsRoute
);

// Seed database with TEST PROPERTIES (4 imóveis específicos para teste de reservas)
app.post(
  "/rendizy-server/make-server-67caf26a/dev/seed-test-properties",
  async (c) => {
    try {
      console.log(
        "🌱 Starting TEST PROPERTIES seed (4 specific properties for reservation testing)..."
      );
      const result = await seedTestProperties();

      return c.json({
        success: true,
        message: "Test properties seeded successfully",
        structure: "Location → Accommodation",
        data: {
          locationsCount: result.locations.length,
          propertiesCount: result.properties.length,
          guestsCount: result.guests.length,
          reservationsCount: result.reservations?.length || 0,
          properties: result.properties.map((p) => ({
            id: p.id,
            name: p.name,
            code: p.code,
            type: p.type,
          })),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error seeding test properties:", error);
      return c.json(
        {
          success: false,
          error: "Failed to seed test properties",
          message: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  }
);

// Seed COMPLETE TEST - Location e Listing completos com todos os campos
app.post(
  "/rendizy-server/make-server-67caf26a/dev/seed-complete-test",
  async (c) => {
    try {
      console.log(
        "🌱 Starting COMPLETE TEST seed (full Location + Listing with all features)..."
      );
      const result = await seedCompleteTest();

      return c.json({
        success: true,
        message: "Complete test data seeded successfully",
        structure:
          "Location → Property → Rooms → Listing + Rules + Pricing Settings",
        data: {
          location: {
            id: result.location.id,
            name: result.location.name,
            code: result.location.code,
            address: `${result.location.address.street}, ${result.location.address.number} - ${result.location.address.city}/${result.location.address.state}`,
            sharedAmenities: result.location.sharedAmenities.length,
          },
          property: {
            id: result.property.id,
            name: result.property.name,
            code: result.property.code,
            type: result.property.type,
            maxGuests: result.property.maxGuests,
            bedrooms: result.property.bedrooms,
            bathrooms: result.property.bathrooms,
            area: result.property.area,
            basePrice: result.property.pricing.basePrice,
            amenities: result.property.amenities.length,
          },
          rooms: {
            count: result.rooms.length,
            types: result.rooms.map((r) => r.type),
          },
          listing: {
            id: result.listing.id,
            title: result.listing.title.pt,
            platforms: Object.entries(result.listing.platforms)
              .filter(([k, v]) => v.enabled)
              .map(([k]) => k),
            icalUrls: Object.entries(result.listing.icalUrls).filter(
              ([k, v]) => v
            ).length,
            derivedPricing: result.listing.derivedPricing.enabled,
          },
          additionalSettings: {
            pricingSettings: result.pricingSettings.id,
            accommodationRules: result.accommodationRules.id,
            pets: result.accommodationRules.pets.allowed,
            smoking: result.accommodationRules.smoking.allowed,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error seeding complete test:", error);
      return c.json(
        {
          success: false,
          error: "Failed to seed complete test data",
          message: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  }
);

// Clear all data (apenas para desenvolvimento/testes)
app.post(
  "/rendizy-server/make-server-67caf26a/dev/clear-database",
  async (c) => {
    try {
      console.log("🗑️ Clearing database...");

      const locations = await kv.getByPrefix("location:");
      const properties = await kv.getByPrefix("property:");
      const guests = await kv.getByPrefix("guest:");
      const reservations = await kv.getByPrefix("reservation:");
      const blocks = await kv.getByPrefix("block:");
      const customPrices = await kv.getByPrefix("customprice:");
      const customMinNights = await kv.getByPrefix("customminnight:");
      const organizations = await kv.getByPrefix("org:");
      const users = await kv.getByPrefix("user:");

      const allKeys = [
        ...locations.map((l: any) => `location:${l.id}`),
        ...properties.map((p: any) => `property:${p.id}`),
        ...guests.map((g: any) => `guest:${g.id}`),
        ...reservations.map((r: any) => `reservation:${r.id}`),
        ...blocks.map((b: any) => `block:${b.id}`),
        ...customPrices.map((p: any) => `customprice:${p.id}`),
        ...customMinNights.map((m: any) => `customminnight:${m.id}`),
        ...organizations.map((o: any) => `org:${o.id}`),
        ...users.map((u: any) => `user:${u.id}`),
      ];

      if (allKeys.length > 0) {
        await kv.mdel(allKeys);
      }

      console.log(`✅ Cleared ${allKeys.length} records`);

      return c.json({
        success: true,
        message: "Database cleared successfully",
        data: {
          deletedCount: allKeys.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error clearing database:", error);
      return c.json(
        {
          success: false,
          error: "Failed to clear database",
          message: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  }
);

// ============================================================================
// ERROR HANDLER
// ============================================================================

app.onError((err, c) => {
  console.error("[ERROR]", err);
  return c.json(
    {
      success: false,
      error: "Internal server error",
      message: err.message,
      timestamp: new Date().toISOString(),
    },
    500
  );
});

// ============================================================================
// 404 HANDLER
// ============================================================================

app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: "Not found",
      message: `Route ${c.req.method} ${c.req.path} not found`,
      timestamp: new Date().toISOString(),
    },
    404
  );
});

// ============================================================================
// START SERVER
// ============================================================================

console.log("🚀 Rendizy Backend API starting...");
console.log("📅 All routes registered successfully");

// ✅ DEBUG: Log todas as rotas registradas para organizations
console.log("🔍 [DEBUG] Verificando rotas de organizations...");
// Não podemos listar rotas diretamente no Hono, mas podemos confirmar que foram registradas

Deno.serve((req) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const method = req.method;

  // ✅ DEBUG: Log TODAS as requisições que chegam (CRÍTICO para diagnóstico)
  console.log("🚨 [DEBUG SERVER] === REQUISIÇÃO RECEBIDA NO DENO.SERVE ===");
  console.log("🚨 [DEBUG SERVER] Method:", method);
  console.log("🚨 [DEBUG SERVER] Pathname:", pathname);
  console.log("🚨 [DEBUG SERVER] URL completa:", req.url);
  console.log(
    "🚨 [DEBUG SERVER] Headers:",
    Object.fromEntries(req.headers.entries())
  );

  // ✅ DEBUG ESPECÍFICO: Log detalhado para /organizations
  if (pathname.includes("/organizations")) {
    console.log(
      "🚨 [DEBUG ORGANIZATIONS] === REQUISIÇÃO /organizations NO DENO.SERVE ==="
    );
    console.log("🚨 [DEBUG ORGANIZATIONS] Method:", method);
    console.log("🚨 [DEBUG ORGANIZATIONS] Pathname:", pathname);
    console.log("🚨 [DEBUG ORGANIZATIONS] Search:", url.search);
    console.log(
      "🚨 [DEBUG ORGANIZATIONS] Headers completos:",
      Object.fromEntries(req.headers.entries())
    );
  }

  return app.fetch(req);
});

