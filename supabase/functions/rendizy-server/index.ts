// ============================================================================
// 🔒 RENDIZY BACKEND API - ENTRY POINT CRÍTICO
// ============================================================================
// ⚠️ ATENÇÃO: Este arquivo é o PONTO ÚNICO DE INTEGRAÇÃO de todos os módulos
// 
// ANTES DE MODIFICAR, LEIA OBRIGATORIAMENTE:
// 📚 docs/architecture/BLINDAGEM_MODULAR_ANTI_REGRESSAO.md (⚠️ OBRIGATÓRIO)
// 📚 docs/operations/SETUP_COMPLETO.md (Seção 4.4 - CORS)
//
// REGRAS CRÍTICAS:
// 1. CORS (linhas 30-60) → NÃO MODIFICAR sem ler documentação
// 2. Imports (linhas 20-28) → SEMPRE adicionar ANTES de usar na linha 80+
// 3. Auth routes (linhas 65-70) → NÃO MOVER (login depende da ordem)
// 4. TESTAR com `deno check index.ts` ANTES de QUALQUER commit
//
// HISTÓRICO DE PROBLEMAS:
// - 23/12/2025: Import faltando → crash global → CORS quebrado (2h debug)
// - 20/11/2025: CORS modificado → login quebrado (documentado SETUP_COMPLETO.md)
//
// 🎯 REGRA DE OURO: Se funciona, NÃO MEXER sem documentar!
// ============================================================================

import { Hono } from "npm:hono";
import { logger } from "npm:hono/logger";

// ============================================================================
// 📦 IMPORTS DE MÓDULOS (SEMPRE ADICIONAR ANTES DE USAR NAS ROTAS)
// ============================================================================
// ⚠️ CHECKLIST PARA NOVOS IMPORTS:
// [ ] Import adicionado aqui PRIMEIRO
// [ ] Rota registrada nas linhas 100+ DEPOIS
// [ ] Se persistência: usar RPC atômica (docs/architecture/PERSISTENCIA_ATOMICA_PADRAO_VITORIOSO.md)
// [ ] Testado com: deno check index.ts (ou .\VALIDATE-BEFORE-DEPLOY.ps1)
// [ ] Deploy testado em staging antes de produção
// 
// 📚 PADRÃO DE PERSISTÊNCIA (LEITURA OBRIGATÓRIA):
// - docs/architecture/PERSISTENCIA_ATOMICA_PADRAO_VITORIOSO.md
// - Exemplo vitorioso: save_anuncio_field (UPSERT + idempotência)
// - Nunca usar INSERT/UPDATE separados (race condition!)
// ============================================================================
import authApp from "./routes-auth.ts";
import propertiesApp from "./routes-properties.ts";
import clientSitesApp from "./routes-client-sites.ts";
import * as reservationsRoutes from "./routes-reservations.ts";
import * as calendarRoutes from "./routes-calendar.ts";
import blocksApp from "./routes-blocks.ts";
import icalApp from "./routes-ical.ts";
import * as guestsRoutes from "./routes-guests.ts";
import * as staysnetRoutes from "./routes-staysnet.ts";
import * as staysnetWebhooksRoutes from "./routes-staysnet-webhooks.ts";
import * as staysnetImportModalRoutes from "./routes-staysnet-import-modal.ts";
import * as dataReconciliationRoutes from "./routes-data-reconciliation.ts";
import * as reconciliationRoutes from "./routes-reconciliation.ts"; // ✅ Reconciliação de reservas (multi-canal)
import * as listingSettingsRoutes from "./routes-listing-settings.ts";
import { tenancyMiddleware, isSuperAdmin } from "./utils-tenancy.ts";
import { importStaysNetSimple } from "./import-staysnet-simple.ts";
import { importStaysNetRPC } from "./import-staysnet-RPC.ts"; // ✅ Adicionado 23/12/2025
import { importStaysNetProperties } from "./import-staysnet-properties.ts"; // ✅ MODULAR: Properties separadas
import { importStaysNetReservations } from "./import-staysnet-reservations.ts"; // ✅ MODULAR: Reservations separadas
import { importStaysNetGuests } from "./import-staysnet-guests.ts"; // ✅ MODULAR: Guests separados
import { importStaysNetBlocks } from "./import-staysnet-blocks.ts"; // ✅ MODULAR: Blocks separadas
import { importStaysNetFinance } from "./import-staysnet-finance.ts"; // ✅ MODULAR: Finance RAW (staysnet_raw_objects)
import { listStaysNetImportIssues } from "./import-staysnet-issues.ts"; // ✅ MODULAR: Issues (reservas sem imóvel)
import chatApp from "./routes-chat.ts";
import { whatsappEvolutionRoutes } from "./routes-whatsapp-evolution.ts";
import { channelInstancesRoutes } from "./routes-channel-instances.ts"; // ✅ v2.0: Multi-instance WhatsApp
import * as currencySettingsRoutes from "./routes-currency-settings.ts";
import { registerDiscountPackagesRoutes } from "./routes-discount-packages.ts";
import * as organizationsRoutes from "./routes-organizations.ts";
import usersApp from "./routes-users.ts";
import meApp from "./routes-me.ts"; // ✅ v1.0.114: Perfil do usuário logado (avatar, etc)
import ownersApp from "./routes-owners.ts";
import * as photosRoutes from "./routes-photos.ts";
import * as stripeRoutes from "./routes-stripe.ts";
import * as paymentsRoutes from "./routes-payments.ts";
import * as cronPendingReservationsRoutes from "./routes-cron-pending-reservations.ts"; // ✅ CRON: Cancelar pendentes expiradas
import * as cronStaysnetRoutes from "./routes-cron-staysnet.ts"; // ✅ CRON: StaysNet sync (consolidado ADR)
import * as cronReconciliationRoutes from "./routes-cron-reconciliation.ts"; // ✅ CRON: Reconciliação diária de reservas
import * as authSocialRoutes from "./routes-auth-social.ts"; // ✅ OAuth: Login Google/Apple
import * as calendarRulesBatchRoutes from "./routes-calendar-rules-batch.ts"; // ✅ Batch rules (migrado ADR)
import * as calendarAvailabilityBatchRoutes from "./routes-calendar-availability-batch.ts"; // ✅ Batch availability (V3 Rate Plans)
import { guestAreaApp } from "./routes-guest-area.ts"; // 🏠 CÁPSULA: Área do Hóspede
import * as automationsRoutes from "./routes-automations.ts"; // ✅ Automações: CRUD
import * as automationsAiRoutes from "./routes-automations-ai.ts"; // ✅ Automações: AI (linguagem natural)
import * as automationsTriggerRoutes from "./routes-automations-trigger.ts"; // ✅ Automações: Trigger/Execução
import aiAgentsApp from "./routes-ai-agents.ts"; // ✅ AI Agents: Scraping automatizado com IA
import { realEstateRoutes } from "./routes-real-estate.ts"; // 🏗️ REAL ESTATE: Marketplace B2B Imobiliário
import { registerChannexRoutes } from "./routes-channex.ts"; // 🔗 CHANNEX: Channel Manager OTA Integration
import { registerChannexSyncRoutes } from "./routes-channex-sync.ts"; // 🔗 CHANNEX: Fase 2 - Sync/Mapping Multi-Account

// ============================================================================
// 📊 CRM MODULAR (Arquitetura separada por módulo)
// ============================================================================
import * as salesRoutes from "./routes-sales.ts"; // 🛒 VENDAS: Funis + Deals
import * as servicesRoutes from "./routes-services.ts"; // 🔧 SERVIÇOS: Funis + Tickets
import * as predeterminedRoutes from "./routes-predetermined.ts"; // 📋 PRÉ-DETERMINADOS: Funis + Items
import * as crmContactsRoutes from "./routes-crm-contacts.ts"; // 👤 CONTATOS: Pessoas CRM
import * as crmCompaniesRoutes from "./routes-crm-companies.ts"; // 🏢 EMPRESAS: Organizações CRM
import * as crmNotesRoutes from "./routes-crm-notes.ts"; // 📝 NOTAS: Observações CRM
import * as crmTasksRoutes from "./routes-crm-tasks.ts"; // ✅ TAREFAS: Tasks/Atividades CRM
import * as notificationProvidersRoutes from "./routes-notification-providers.ts"; // 📬 NOTIFICAÇÕES: Config de providers
import * as notificationTemplatesRoutes from "./routes-notification-templates.ts"; // 📝 NOTIFICAÇÕES: Templates multi-canal

const app = new Hono();

// ============================================================================
// HEALTH CHECK (frontend usa: GET /health)
// ============================================================================
function withCorsJson(c: any, payload: unknown) {
  // Esses handlers ficam ANTES do middleware global; então setamos CORS aqui também.
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, apikey, X-Auth-Token, x-client-info, Prefer, x-organization-id");
  c.header("Access-Control-Max-Age", "86400");
  return c.json(payload);
}

app.get("/health", (c) => withCorsJson(c, { ok: true }));
// Compat: alguns clients chamam com prefixo /rendizy-server
app.get("/rendizy-server/health", (c) => withCorsJson(c, { ok: true }));

// DEBUG: Testar conexão do banco para webhook
app.get("/webhook-db-test", async (c) => {
  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = await import('./utils-env.ts');
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    
    const url = SUPABASE_URL || '';
    const key = SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!url || !key) {
      return withCorsJson(c, { error: 'Missing env vars', url: url ? 'OK' : 'MISSING', key: key ? 'OK' : 'MISSING' });
    }
    
    const supabase = createClient(url, key);
    
    const { data, error } = await supabase
      .from('staysnet_webhooks')
      .insert({
        organization_id: 'debug-test',
        action: 'debug.test',
        payload: { test: true, timestamp: new Date().toISOString() },
        received_at: new Date().toISOString(),
        processed: false,
      })
      .select('id')
      .single();
      
    if (error) {
      return withCorsJson(c, { error: error.message, code: error.code });
    }
    
    return withCorsJson(c, { success: true, id: data.id });
  } catch (e: any) {
    return withCorsJson(c, { error: e.message });
  }
});
app.get("/rendizy-server/webhook-db-test", async (c) => {
  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = await import('./utils-env.ts');
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    
    const url = SUPABASE_URL || '';
    const key = SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!url || !key) {
      return withCorsJson(c, { error: 'Missing env vars', url: url ? 'OK' : 'MISSING', key: key ? 'OK' : 'MISSING' });
    }
    
    const supabase = createClient(url, key);
    
    const { data, error } = await supabase
      .from('staysnet_webhooks')
      .insert({
        organization_id: 'debug-test',
        action: 'debug.test',
        payload: { test: true, timestamp: new Date().toISOString() },
        received_at: new Date().toISOString(),
        processed: false,
      })
      .select('id')
      .single();
      
    if (error) {
      return withCorsJson(c, { error: error.message, code: error.code });
    }
    
    return withCorsJson(c, { success: true, id: data.id });
  } catch (e: any) {
    return withCorsJson(c, { error: e.message });
  }
});

// ============================================================================
// 🛡️ CAMADA 1: CORS PROTECTION (CRÍTICO - NÃO MODIFICAR)
// ============================================================================
// ⚠️ ATENÇÃO: Esta é a configuração que FUNCIONA após múltiplas iterações
// 
// HISTÓRICO:
// - 20/11/2025: Tentativa com credentials:true FALHOU (SETUP_COMPLETO.md)
// - 23/12/2025: Movido para middleware global para garantir OPTIONS
//
// REGRAS:
// ✅ origin: "*" SEM credentials:true → FUNCIONA
// ❌ NUNCA adicionar credentials:true (quebra CORS)
// ❌ NUNCA remover este middleware (login para de funcionar)
// ❌ NUNCA modificar headers sem testar OPTIONS: curl -X OPTIONS [URL]
//
// REFERÊNCIA: docs/operations/SETUP_COMPLETO.md (Seção 4.4)
// ============================================================================
app.use("*", async (c, next) => {
  // Set CORS headers for ALL requests
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, apikey, X-Auth-Token, x-client-info, Prefer, x-organization-id");
  c.header("Access-Control-Max-Age", "86400");
  
  // Handle preflight - retornar IMEDIATAMENTE sem processar mais nada
  if (c.req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, apikey, X-Auth-Token, x-client-info, Prefer, x-organization-id",
        "Access-Control-Max-Age": "86400",
      }
    });
  }
  
  return await next();
});

// Logger depois do CORS
app.use("*", logger());

// ============================================================================
// AUTH ROUTES (CRITICAL - Login & Session)
// ============================================================================
app.route("/rendizy-server/make-server-67caf26a/auth", authApp);
app.route("/rendizy-server/auth", authApp); // Compatibility
// Alias sem prefixo: o frontend usa API_BASE=/functions/v1/rendizy-server e chama /auth/*
app.route("/make-server-67caf26a/auth", authApp);
app.route("/auth", authApp);

// ============================================================================
// AUTH SOCIAL (Login Google/Apple OAuth)
// ============================================================================
app.post("/auth/social/google", authSocialRoutes.handleStaffGoogleLogin);
app.post("/rendizy-server/auth/social/google", authSocialRoutes.handleStaffGoogleLogin);

// ============================================================================
// 🏠 GUEST AREA (Cápsula - Área do Hóspede - PÚBLICA)
// ============================================================================
// URL: /guest/* → Usado pelos sites de clientes para área interna
app.route("/guest", guestAreaApp);
app.route("/rendizy-server/guest", guestAreaApp);

// ============================================================================
// PROPERTIES (Imóveis/Propriedades)
// ============================================================================
// URL CANÔNICA (externa): /functions/v1/rendizy-server/properties/*
// OBS: em produção, o pathname recebido pelo Hono inclui o nome da function como prefixo.
// Então montamos o módulo em /rendizy-server/properties/* para bater com:
// /functions/v1/rendizy-server/properties/*
app.route("/rendizy-server/properties", propertiesApp);

// ============================================================================
// CLIENT SITES (Sites dos Clientes)
// ============================================================================
app.route("/rendizy-server/client-sites", clientSitesApp);
app.route("/rendizy-server/make-server-67caf26a/client-sites", clientSitesApp); // compat

// ============================================================================
// CURRENCY SETTINGS (Configurações > Precificação > Moedas)
// ============================================================================
app.get("/organizations/:id/currency-settings", currencySettingsRoutes.getOrganizationCurrencySettings);
app.put("/organizations/:id/currency-settings", currencySettingsRoutes.updateOrganizationCurrencySettings);

// Compat com prefixo /rendizy-server
app.get("/rendizy-server/organizations/:id/currency-settings", currencySettingsRoutes.getOrganizationCurrencySettings);
app.put("/rendizy-server/organizations/:id/currency-settings", currencySettingsRoutes.updateOrganizationCurrencySettings);

// ============================================================================
// DISCOUNT PACKAGES (Configurações > Precificação > Descontos por pacote de dias)
// ============================================================================
registerDiscountPackagesRoutes(app);

// ============================================================================
// ORGANIZATIONS & USERS (Admin Master)
// ============================================================================
function ensureSuperAdmin(c: any) {
  if (!isSuperAdmin(c)) {
    c.status(403);
    return withCorsJson(c, { success: false, error: "Forbidden" });
  }
  return null;
}

// Canonical: /functions/v1/rendizy-server/organizations -> pathname interno: /rendizy-server/organizations
app.get("/rendizy-server/organizations", tenancyMiddleware, async (c) => {
  const forbidden = ensureSuperAdmin(c);
  if (forbidden) return forbidden;
  return await organizationsRoutes.listOrganizations(c);
});
app.get("/rendizy-server/organizations/:id", tenancyMiddleware, async (c) => {
  const forbidden = ensureSuperAdmin(c);
  if (forbidden) return forbidden;
  return await organizationsRoutes.getOrganization(c);
});
app.get("/rendizy-server/organizations/slug/:slug", tenancyMiddleware, async (c) => {
  const forbidden = ensureSuperAdmin(c);
  if (forbidden) return forbidden;
  return await organizationsRoutes.getOrganizationBySlug(c);
});
app.post("/rendizy-server/organizations", tenancyMiddleware, async (c) => {
  const forbidden = ensureSuperAdmin(c);
  if (forbidden) return forbidden;
  return await organizationsRoutes.createOrganization(c);
});
app.patch("/rendizy-server/organizations/:id", tenancyMiddleware, async (c) => {
  const forbidden = ensureSuperAdmin(c);
  if (forbidden) return forbidden;
  return await organizationsRoutes.updateOrganization(c);
});
app.delete("/rendizy-server/organizations/:id", tenancyMiddleware, async (c) => {
  const forbidden = ensureSuperAdmin(c);
  if (forbidden) return forbidden;
  return await organizationsRoutes.deleteOrganization(c);
});
app.get("/rendizy-server/organizations/:id/stats", tenancyMiddleware, async (c) => {
  const forbidden = ensureSuperAdmin(c);
  if (forbidden) return forbidden;
  return await organizationsRoutes.getOrganizationStats(c);
});

// ============================================================================
// OWNERS (Proprietários)
// ============================================================================
app.route("/rendizy-server/owners", ownersApp);
app.route("/owners", ownersApp);

// Compat: alguns scripts/clients usam prefixo make-server
app.get("/rendizy-server/make-server-67caf26a/organizations", tenancyMiddleware, async (c) => {
  const forbidden = ensureSuperAdmin(c);
  if (forbidden) return forbidden;
  return await organizationsRoutes.listOrganizations(c);
});
app.get("/rendizy-server/make-server-67caf26a/organizations/:id", tenancyMiddleware, async (c) => {
  const forbidden = ensureSuperAdmin(c);
  if (forbidden) return forbidden;
  return await organizationsRoutes.getOrganization(c);
});
app.get("/rendizy-server/make-server-67caf26a/organizations/slug/:slug", tenancyMiddleware, async (c) => {
  const forbidden = ensureSuperAdmin(c);
  if (forbidden) return forbidden;
  return await organizationsRoutes.getOrganizationBySlug(c);
});
app.post("/rendizy-server/make-server-67caf26a/organizations", tenancyMiddleware, async (c) => {
  const forbidden = ensureSuperAdmin(c);
  if (forbidden) return forbidden;
  return await organizationsRoutes.createOrganization(c);
});
app.patch("/rendizy-server/make-server-67caf26a/organizations/:id", tenancyMiddleware, async (c) => {
  const forbidden = ensureSuperAdmin(c);
  if (forbidden) return forbidden;
  return await organizationsRoutes.updateOrganization(c);
});
app.delete("/rendizy-server/make-server-67caf26a/organizations/:id", tenancyMiddleware, async (c) => {
  const forbidden = ensureSuperAdmin(c);
  if (forbidden) return forbidden;
  return await organizationsRoutes.deleteOrganization(c);
});
app.get("/rendizy-server/make-server-67caf26a/organizations/:id/stats", tenancyMiddleware, async (c) => {
  const forbidden = ensureSuperAdmin(c);
  if (forbidden) return forbidden;
  return await organizationsRoutes.getOrganizationStats(c);
});

// Settings globais (multi-tenant): resolve org via token; não exige superadmin.
app.get("/rendizy-server/organizations/:id/settings/global", tenancyMiddleware, organizationsRoutes.getOrganizationSettings);
app.put("/rendizy-server/organizations/:id/settings/global", tenancyMiddleware, organizationsRoutes.updateOrganizationSettings);

// Settings por anúncio/listing (override individual)
app.get(
  "/rendizy-server/organizations/:id/settings/listings",
  tenancyMiddleware,
  listingSettingsRoutes.listOrganizationListingSettings
);
app.get(
  "/rendizy-server/listings/:id/settings",
  tenancyMiddleware,
  listingSettingsRoutes.getListingSettings
);
app.put(
  "/rendizy-server/listings/:id/settings",
  tenancyMiddleware,
  listingSettingsRoutes.updateListingSettings
);
app.post(
  "/rendizy-server/listings/:id/settings/toggle-override",
  tenancyMiddleware,
  listingSettingsRoutes.toggleListingOverride
);
app.post(
  "/rendizy-server/listings/:id/settings/reset",
  tenancyMiddleware,
  listingSettingsRoutes.resetListingSettings
);

// Alias sem prefixo /rendizy-server (compat)
app.get("/organizations", tenancyMiddleware, async (c) => {
  const forbidden = ensureSuperAdmin(c);
  if (forbidden) return forbidden;
  return await organizationsRoutes.listOrganizations(c);
});
app.get("/organizations/:id", tenancyMiddleware, async (c) => {
  const forbidden = ensureSuperAdmin(c);
  if (forbidden) return forbidden;
  return await organizationsRoutes.getOrganization(c);
});
app.get("/organizations/slug/:slug", tenancyMiddleware, async (c) => {
  const forbidden = ensureSuperAdmin(c);
  if (forbidden) return forbidden;
  return await organizationsRoutes.getOrganizationBySlug(c);
});
app.post("/organizations", tenancyMiddleware, async (c) => {
  const forbidden = ensureSuperAdmin(c);
  if (forbidden) return forbidden;
  return await organizationsRoutes.createOrganization(c);
});
app.patch("/organizations/:id", tenancyMiddleware, async (c) => {
  const forbidden = ensureSuperAdmin(c);
  if (forbidden) return forbidden;
  return await organizationsRoutes.updateOrganization(c);
});
app.delete("/organizations/:id", tenancyMiddleware, async (c) => {
  const forbidden = ensureSuperAdmin(c);
  if (forbidden) return forbidden;
  return await organizationsRoutes.deleteOrganization(c);
});
app.get("/organizations/:id/stats", tenancyMiddleware, async (c) => {
  const forbidden = ensureSuperAdmin(c);
  if (forbidden) return forbidden;
  return await organizationsRoutes.getOrganizationStats(c);
});
app.get("/organizations/:id/settings/global", tenancyMiddleware, organizationsRoutes.getOrganizationSettings);
app.put("/organizations/:id/settings/global", tenancyMiddleware, organizationsRoutes.updateOrganizationSettings);

// Alias sem prefixo para settings de listings
app.get(
  "/organizations/:id/settings/listings",
  tenancyMiddleware,
  listingSettingsRoutes.listOrganizationListingSettings
);
app.get(
  "/listings/:id/settings",
  tenancyMiddleware,
  listingSettingsRoutes.getListingSettings
);
app.put(
  "/listings/:id/settings",
  tenancyMiddleware,
  listingSettingsRoutes.updateListingSettings
);
app.post(
  "/listings/:id/settings/toggle-override",
  tenancyMiddleware,
  listingSettingsRoutes.toggleListingOverride
);
app.post(
  "/listings/:id/settings/reset",
  tenancyMiddleware,
  listingSettingsRoutes.resetListingSettings
);

// Compat extra make-server (settings globais)
app.get(
  "/rendizy-server/make-server-67caf26a/organizations/:id/settings/global",
  tenancyMiddleware,
  organizationsRoutes.getOrganizationSettings
);
app.put(
  "/rendizy-server/make-server-67caf26a/organizations/:id/settings/global",
  tenancyMiddleware,
  organizationsRoutes.updateOrganizationSettings
);
app.get(
  "/make-server-67caf26a/organizations/:id/settings/global",
  tenancyMiddleware,
  organizationsRoutes.getOrganizationSettings
);
app.put(
  "/make-server-67caf26a/organizations/:id/settings/global",
  tenancyMiddleware,
  organizationsRoutes.updateOrganizationSettings
);

// Users (Admin Master)
app.route("/rendizy-server/users", usersApp);
app.route("/users", usersApp);
app.route("/rendizy-server/make-server-67caf26a/users", usersApp);
app.route("/make-server-67caf26a/users", usersApp);

// ✅ Me (Usuário logado - perfil próprio, avatar, etc)
app.route("/rendizy-server/me", meApp);
app.route("/me", meApp);
app.route("/rendizy-server/make-server-67caf26a/me", meApp);
app.route("/make-server-67caf26a/me", meApp);

// ============================================================================
// RESERVATIONS
// ============================================================================
app.get("/rendizy-server/reservations", tenancyMiddleware, reservationsRoutes.listReservations);
app.get("/rendizy-server/reservations/summary", tenancyMiddleware, reservationsRoutes.getReservationsSummary);
app.get("/rendizy-server/reservations/kpis", tenancyMiddleware, reservationsRoutes.getReservationsKpis);
app.get("/rendizy-server/reservations/:id", tenancyMiddleware, reservationsRoutes.getReservation);
app.post("/rendizy-server/reservations", tenancyMiddleware, reservationsRoutes.createReservation);
app.put("/rendizy-server/reservations/:id", tenancyMiddleware, reservationsRoutes.updateReservation);
app.delete("/rendizy-server/reservations/:id", tenancyMiddleware, reservationsRoutes.deleteReservation);

// Alias sem prefixo: alguns pontos do frontend chamam diretamente `/reservations/*`
// (base: /functions/v1/rendizy-server). Mantemos as duas formas para estabilidade.
app.get("/reservations", tenancyMiddleware, reservationsRoutes.listReservations);
app.get("/reservations/summary", tenancyMiddleware, reservationsRoutes.getReservationsSummary);
app.get("/reservations/kpis", tenancyMiddleware, reservationsRoutes.getReservationsKpis);
app.get("/reservations/:id", tenancyMiddleware, reservationsRoutes.getReservation);
app.post("/reservations", tenancyMiddleware, reservationsRoutes.createReservation);
app.put("/reservations/:id", tenancyMiddleware, reservationsRoutes.updateReservation);
app.delete("/reservations/:id", tenancyMiddleware, reservationsRoutes.deleteReservation);

// ============================================================================
// CALENDAR / BLOCKS
// ============================================================================
// Calendário completo (SQL) + aliases (frontend utils/api.ts chama /calendar)
app.get("/calendar", tenancyMiddleware, calendarRoutes.getCalendarDataSql);
app.get("/calendar/stats", tenancyMiddleware, calendarRoutes.getCalendarStatsSql);
app.get("/rendizy-server/calendar", tenancyMiddleware, calendarRoutes.getCalendarDataSql);
app.get("/rendizy-server/calendar/stats", tenancyMiddleware, calendarRoutes.getCalendarStatsSql);

// Blocks via calendário (SQL) + compat legado
app.get("/calendar/blocks", tenancyMiddleware, calendarRoutes.getCalendarBlocksSql);
app.post("/calendar/blocks", tenancyMiddleware, calendarRoutes.createCalendarBlockSql);
app.delete("/calendar/blocks/:id", tenancyMiddleware, calendarRoutes.deleteCalendarBlockSql);

app.get("/rendizy-server/calendar/blocks", tenancyMiddleware, calendarRoutes.getCalendarBlocksSql);
app.post("/rendizy-server/calendar/blocks", tenancyMiddleware, calendarRoutes.createCalendarBlockSql);
app.delete("/rendizy-server/calendar/blocks/:id", tenancyMiddleware, calendarRoutes.deleteCalendarBlockSql);

// ============================================================================
// BLOCKS LEGACY ROUTER (compat)
// ============================================================================
app.route("/rendizy-server/blocks", blocksApp);

// ============================================================================
// BLOCKS (LEGACY make-server) - frontend utils/api.ts chama:
// GET /make-server-67caf26a/blocks?propertyIds=...
// ============================================================================
app.route("/make-server-67caf26a/blocks", blocksApp);
// Compat extra (alguns clientes antigos duplicam prefixo)
app.route("/rendizy-server/make-server-67caf26a/blocks", blocksApp);

// ============================================================================
// ICAL (Airbnb/Booking/etc) - Sync de calendário externo
// ============================================================================
app.route("/rendizy-server/ical", icalApp);
app.route("/rendizy-server/make-server-67caf26a/ical", icalApp); // compat com prefix usado no frontend

// ============================================================================
// PHOTOS (Supabase Storage) - Upload persistente de imagens
// ============================================================================
// Frontend (utils/api.ts) usa: POST ${API_BASE_URL}/photos/upload
// Em produção, o pathname costuma vir como /rendizy-server/photos/*; por isso mantemos aliases.
app.post("/photos/upload", photosRoutes.uploadPhoto);
app.post("/rendizy-server/photos/upload", photosRoutes.uploadPhoto);
app.post("/make-server-67caf26a/photos/upload", photosRoutes.uploadPhoto);
app.post("/rendizy-server/make-server-67caf26a/photos/upload", photosRoutes.uploadPhoto);

// Base64 upload (legado)
app.post("/photos", photosRoutes.uploadPhotoBase64);
app.post("/rendizy-server/photos", photosRoutes.uploadPhotoBase64);
app.post("/make-server-67caf26a/photos", photosRoutes.uploadPhotoBase64);
app.post("/rendizy-server/make-server-67caf26a/photos", photosRoutes.uploadPhotoBase64);

// List / delete / update metadata
app.get("/photos/property/:propertyId", photosRoutes.listPropertyPhotos);
app.get("/rendizy-server/photos/property/:propertyId", photosRoutes.listPropertyPhotos);
app.get("/make-server-67caf26a/photos/property/:propertyId", photosRoutes.listPropertyPhotos);
app.get("/rendizy-server/make-server-67caf26a/photos/property/:propertyId", photosRoutes.listPropertyPhotos);

app.delete("/photos/:path", photosRoutes.deletePhoto);
app.delete("/rendizy-server/photos/:path", photosRoutes.deletePhoto);
app.delete("/make-server-67caf26a/photos/:path", photosRoutes.deletePhoto);
app.delete("/rendizy-server/make-server-67caf26a/photos/:path", photosRoutes.deletePhoto);

app.put("/photos/:photoId", photosRoutes.updatePhoto);
app.put("/rendizy-server/photos/:photoId", photosRoutes.updatePhoto);
app.put("/make-server-67caf26a/photos/:photoId", photosRoutes.updatePhoto);
app.put("/rendizy-server/make-server-67caf26a/photos/:photoId", photosRoutes.updatePhoto);

// ============================================================================
// 🏗️ REAL ESTATE MODULE - Marketplace B2B Imobiliário
// ============================================================================
// Módulo encapsulado - pode ser removido sem afetar o Rendizy
// Frontend: /realestate/*
// Tabelas: re_companies, re_developments, re_units, re_partnerships, re_reservations, etc.
app.route("/realestate", realEstateRoutes);
app.route("/rendizy-server/realestate", realEstateRoutes);

// ============================================================================
// 🔗 CHANNEX - Channel Manager OTA Integration
// ============================================================================
// Integração com Channex.io para conectar a múltiplas OTAs (Airbnb, Booking, etc.)
// Rotas: /channex/status, /channex/test-connection, /channex/properties, etc.
registerChannexRoutes(app);
registerChannexSyncRoutes(app); // Fase 2: Accounts CRUD, Sync, Mappings, Channels, Listings
// Alias com prefixo rendizy-server
app.get("/rendizy-server/channex/status", (c) => app.fetch(new Request(c.req.url.replace('/rendizy-server', ''), c.req.raw)));
app.post("/rendizy-server/channex/test-connection", (c) => app.fetch(new Request(c.req.url.replace('/rendizy-server', ''), c.req.raw)));

// ============================================================================
// CHAT / CHANNELS (WhatsApp Evolution + outros canais)
// ============================================================================
// Frontend atual usa: /chat/channels/*
// Mantemos também /rendizy-server/chat/* por compatibilidade com docs/legado.
app.route("/chat", chatApp);
app.route("/rendizy-server/chat", chatApp);
app.route("/rendizy-server/make-server-67caf26a/chat", chatApp);

// ============================================================================
// WHATSAPP EVOLUTION API (contrato legado + aliases estáveis)
// ============================================================================
// Registra o contrato legado (não modificar aqui; está em routes-whatsapp-evolution.ts)
whatsappEvolutionRoutes(app as any);

// ============================================================================
// CHANNEL INSTANCES API v2.0 - Multi-instance WhatsApp
// ============================================================================
// Nova API para gerenciar múltiplas instâncias por organização
// Usa tabela channel_instances com arquitetura multi-tenant
channelInstancesRoutes(app as any);

// Alias estável: frontend novo usa /whatsapp/*
// Reescreve para o prefixo legado sem duplicar handlers.
const LEGACY_WHATSAPP_PREFIX = "/rendizy-server/make-server-67caf26a/whatsapp";

function mapWhatsAppAliasPath(pathname: string): string {
  if (pathname === "/whatsapp") return LEGACY_WHATSAPP_PREFIX;
  if (pathname.startsWith("/whatsapp/")) {
    return `${LEGACY_WHATSAPP_PREFIX}${pathname.slice("/whatsapp".length)}`;
  }
  if (pathname === "/rendizy-server/whatsapp") return LEGACY_WHATSAPP_PREFIX;
  if (pathname.startsWith("/rendizy-server/whatsapp/")) {
    return `${LEGACY_WHATSAPP_PREFIX}${pathname.slice("/rendizy-server/whatsapp".length)}`;
  }
  return pathname;
}

app.all("/whatsapp/*", async (c) => {
  const raw = c.req.raw;
  const url = new URL(raw.url);
  url.pathname = mapWhatsAppAliasPath(url.pathname);

  const forwardedReq = new Request(url.toString(), {
    method: raw.method,
    headers: raw.headers,
    body: raw.body,
  });

  return app.fetch(forwardedReq);
});

app.all("/rendizy-server/whatsapp/*", async (c) => {
  const raw = c.req.raw;
  const url = new URL(raw.url);
  url.pathname = mapWhatsAppAliasPath(url.pathname);

  const forwardedReq = new Request(url.toString(), {
    method: raw.method,
    headers: raw.headers,
    body: raw.body,
  });

  return app.fetch(forwardedReq);
});

// ============================================================================
// STAYS.NET INTEGRAÇÃO
// ============================================================================
// Mantemos todos os endpoints StaysNet registrados aqui para evitar voltar ao
// fallback "Edge Function funcionando" no frontend; paths são usados pelo hook
// `useStaysNetConfig` e pelo service `StaysNetService` (não renomear sem alinhar UI).
app.get("/rendizy-server/make-server-67caf26a/settings/staysnet", staysnetRoutes.getStaysNetConfig);
app.post("/rendizy-server/make-server-67caf26a/settings/staysnet", staysnetRoutes.saveStaysNetConfig);
app.post("/rendizy-server/make-server-67caf26a/staysnet/test", staysnetRoutes.testStaysNetConnection);
app.post("/rendizy-server/make-server-67caf26a/staysnet/test-endpoint", staysnetRoutes.testStaysNetEndpoint);
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/preview", staysnetImportModalRoutes.previewStaysNetImport);
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/full", staysnetImportModalRoutes.importFullStaysNet);
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/debug", staysnetImportModalRoutes.debugRawStaysNet); // 🧪 DEBUG
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/SIMPLE", importStaysNetSimple); // ⚡ SIMPLES - INSERT direto
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/RPC", importStaysNetRPC); // ✅ USA RPC (igual FormularioAnuncio) - LEGACY

// Compat extra: alguns frontends chamam sem prefixo /rendizy-server
app.get("/make-server-67caf26a/settings/staysnet", staysnetRoutes.getStaysNetConfig);
app.post("/make-server-67caf26a/settings/staysnet", staysnetRoutes.saveStaysNetConfig);
app.post("/make-server-67caf26a/staysnet/test", staysnetRoutes.testStaysNetConnection);
app.post("/make-server-67caf26a/staysnet/test-endpoint", staysnetRoutes.testStaysNetEndpoint);
app.post("/make-server-67caf26a/staysnet/import/preview", staysnetImportModalRoutes.previewStaysNetImport);
app.post("/make-server-67caf26a/staysnet/import/full", staysnetImportModalRoutes.importFullStaysNet);
app.post("/make-server-67caf26a/staysnet/import/debug", staysnetImportModalRoutes.debugRawStaysNet);
app.post("/make-server-67caf26a/staysnet/import/SIMPLE", importStaysNetSimple);
app.post("/make-server-67caf26a/staysnet/import/RPC", importStaysNetRPC);

// ============================================================================
// WEBHOOK HANDLER INLINE (evita problema de ExecutionContext)
// ============================================================================
const webhookHandler = async (c: HonoContext) => {
  console.log('[StaysNet Webhook INLINE] 🚀 INICIO');
  try {
    const organizationId = c.req.param('organizationId');
    console.log('[StaysNet Webhook INLINE] 📝 organizationId:', organizationId);
    
    if (!organizationId) {
      return c.json({ success: false, error: 'organizationId is required' }, 400);
    }

    // Ler body
    let rawText = '';
    try {
      rawText = await c.req.text();
      console.log('[StaysNet Webhook INLINE] 📝 Body length:', rawText.length);
    } catch (e: any) {
      console.error('[StaysNet Webhook INLINE] ❌ Error reading body:', e.message);
      return c.json({ success: false, error: 'Failed to read body: ' + e.message }, 500);
    }

    // Parse JSON
    let body: any = rawText;
    try {
      body = JSON.parse(rawText);
      console.log('[StaysNet Webhook INLINE] 📝 Body parsed OK');
    } catch {
      console.log('[StaysNet Webhook INLINE] ⚠️ Body is not JSON');
    }

    const action = typeof body === 'object' && body ? String(body.action || 'unknown') : 'unknown';
    const payload = typeof body === 'object' && body ? (body.payload ?? body) : body;
    console.log('[StaysNet Webhook INLINE] 📝 action:', action);

    // Headers
    const clientId = c.req.header('x-stays-client-id') || null;
    const signature = c.req.header('x-stays-signature') || null;
    const dt = typeof body === 'object' && body ? (body._dt ?? null) : null;

    // Import dinâmico para evitar problemas de inicialização
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = await import('./utils-env.ts');
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    
    const url = SUPABASE_URL || '';
    const key = SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!url || !key) {
      console.error('[StaysNet Webhook INLINE] ❌ Missing env vars');
      return c.json({ success: false, error: 'Missing Supabase credentials' }, 500);
    }
    
    const supabase = createClient(url, key);
    console.log('[StaysNet Webhook INLINE] 📝 Supabase client created');

    // Inserir no banco
    const { data, error } = await supabase
      .from('staysnet_webhooks')
      .insert({
        organization_id: organizationId,
        action,
        payload,
        metadata: {
          received_dt: dt,
          headers: {
            'x-stays-client-id': clientId,
            'x-stays-signature': signature,
            'user-agent': c.req.header('user-agent') || null,
          },
        },
        received_at: new Date().toISOString(),
        processed: false,
      })
      .select('id')
      .single();
      
    if (error) {
      console.error('[StaysNet Webhook INLINE] ❌ DB Error:', error.message);
      return c.json({ success: false, error: 'Database error: ' + error.message }, 500);
    }
    
    console.log('[StaysNet Webhook INLINE] ✅ Webhook salvo! ID:', data.id);
    
    // 🔥 PROCESSAMENTO AUTOMÁTICO: Processar webhooks pendentes imediatamente
    // Isso garante que quando um webhook chega (mesmo atrasado), ele é processado
    console.log('[StaysNet Webhook INLINE] 🔄 Disparando processamento automático...');
    try {
      const { processPendingStaysNetWebhooksForOrg } = await import('./routes-staysnet-webhooks.ts');
      // Processar até 20 webhooks pendentes (incluindo o que acabou de chegar)
      const processResult = await processPendingStaysNetWebhooksForOrg(organizationId, 20);
      console.log('[StaysNet Webhook INLINE] ✅ Processamento automático concluído:', JSON.stringify(processResult));
    } catch (procError: any) {
      // Se falhar o processamento, não falha o webhook - será pego pelo CRON
      console.error('[StaysNet Webhook INLINE] ⚠️ Erro no processamento automático (será retentado pelo CRON):', procError.message);
    }
    
    return c.json({ success: true, id: data.id, received: true, autoProcessed: true, timestamp: new Date().toISOString() });
  } catch (e: any) {
    console.error('[StaysNet Webhook INLINE] ❌ Exception:', e.message, e.stack?.substring(0, 500));
    return c.json({ success: false, error: 'Exception: ' + e.message }, 500);
  }
};

app.post("/staysnet/webhook/:organizationId", webhookHandler);
app.post("/rendizy-server/staysnet/webhook/:organizationId", webhookHandler);

// DEBUG: Teste de inserção no banco
app.get("/staysnet/webhook-debug", async (c) => {
  try {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = await import('./utils-env.ts');
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    
    const url = SUPABASE_URL || '';
    const key = SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!url || !key) {
      return c.json({ error: 'Missing env vars', url: url ? 'OK' : 'MISSING', key: key ? 'OK' : 'MISSING' });
    }
    
    const supabase = createClient(url, key);
    
    const { data, error } = await supabase
      .from('staysnet_webhooks')
      .insert({
        organization_id: 'debug-test',
        action: 'debug.test',
        payload: { test: true, timestamp: new Date().toISOString() },
        received_at: new Date().toISOString(),
        processed: false,
      })
      .select('id')
      .single();
      
    if (error) {
      return c.json({ error: error.message, code: error.code, details: error.details });
    }
    
    return c.json({ success: true, id: data.id });
  } catch (e: any) {
    return c.json({ error: e.message, stack: e.stack?.substring(0, 500) });
  }
});

app.post("/staysnet/webhooks/process/:organizationId", staysnetWebhooksRoutes.processStaysNetWebhooks);
app.post("/rendizy-server/staysnet/webhooks/process/:organizationId", staysnetWebhooksRoutes.processStaysNetWebhooks);
app.get("/staysnet/webhooks/diagnostics/:organizationId", staysnetWebhooksRoutes.getStaysNetWebhooksDiagnostics);
app.get("/rendizy-server/staysnet/webhooks/diagnostics/:organizationId", staysnetWebhooksRoutes.getStaysNetWebhooksDiagnostics);
app.post("/staysnet/backfill/guests/:organizationId", staysnetRoutes.backfillStaysNetReservationGuests);
app.post("/rendizy-server/staysnet/backfill/guests/:organizationId", staysnetRoutes.backfillStaysNetReservationGuests);
app.post("/staysnet/reservations/reconcile/:organizationId", staysnetRoutes.reconcileStaysNetReservations);
app.post("/rendizy-server/staysnet/reservations/reconcile/:organizationId", staysnetRoutes.reconcileStaysNetReservations);

// ============================================================================
// 📊 RECONCILIATION (Multi-Canal - Stays, Airbnb, Booking, etc)
// ============================================================================
// POST /reconciliation/reservations/:organizationId - Reconcilia reservas
app.post("/reconciliation/reservations/:organizationId", reconciliationRoutes.handleReconcileReservations);
app.post("/rendizy-server/reconciliation/reservations/:organizationId", reconciliationRoutes.handleReconcileReservations);
// GET /reconciliation/missing/:organizationId - Lista reservas faltantes
app.get("/reconciliation/missing/:organizationId", reconciliationRoutes.handleFindMissingReservations);
app.get("/rendizy-server/reconciliation/missing/:organizationId", reconciliationRoutes.handleFindMissingReservations);
// POST /reconciliation/validate/:organizationId - Valida uma reserva
app.post("/reconciliation/validate/:organizationId", reconciliationRoutes.handleValidateReservation);
app.post("/rendizy-server/reconciliation/validate/:organizationId", reconciliationRoutes.handleValidateReservation);
// GET /reconciliation/health/:organizationId - Saúde das reservas
app.get("/reconciliation/health/:organizationId", reconciliationRoutes.handleReconciliationHealth);
app.get("/rendizy-server/reconciliation/health/:organizationId", reconciliationRoutes.handleReconciliationHealth);
// GET /reconciliation/compare/:organizationId - Compara Stays x Rendizy (DIAGNÓSTICO)
app.get("/reconciliation/compare/:organizationId", reconciliationRoutes.handleCompareStaysVsRendizy);
app.get("/rendizy-server/reconciliation/compare/:organizationId", reconciliationRoutes.handleCompareStaysVsRendizy);
// POST /reconciliation/force-sync/:organizationId - Força importação de reservas específicas
app.post("/reconciliation/force-sync/:organizationId", reconciliationRoutes.handleForceSyncReservations);
app.post("/rendizy-server/reconciliation/force-sync/:organizationId", reconciliationRoutes.handleForceSyncReservations);
// POST /reconciliation/auto-sync/:organizationId - RECONCILIAÇÃO AUTOMÁTICA COMPLETA
app.post("/reconciliation/auto-sync/:organizationId", reconciliationRoutes.handleAutoSync);
app.post("/rendizy-server/reconciliation/auto-sync/:organizationId", reconciliationRoutes.handleAutoSync);

// ============================================================================
// ⚡ STAYSNET IMPORT MODULAR (v1.0.104) - Separado por entidade
// ============================================================================
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/properties", importStaysNetProperties); // 🏠 Properties → properties
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/reservations", importStaysNetReservations); // 🏨 Reservations → reservations
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/guests", importStaysNetGuests); // 👤 Guests → guests
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/blocks", importStaysNetBlocks); // ⛔ Blocks → blocks
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/finance", importStaysNetFinance); // 💰 Finance RAW → staysnet_raw_objects
app.get("/rendizy-server/make-server-67caf26a/staysnet/import/issues", listStaysNetImportIssues); // ⚠️ Issues abertas (ex: missing property mapping)

// Compat extra: alguns frontends chamam sem prefixo /rendizy-server
app.post("/make-server-67caf26a/staysnet/import/properties", importStaysNetProperties);
app.post("/make-server-67caf26a/staysnet/import/reservations", importStaysNetReservations);
app.post("/make-server-67caf26a/staysnet/import/guests", importStaysNetGuests);
app.post("/make-server-67caf26a/staysnet/import/blocks", importStaysNetBlocks);
app.post("/make-server-67caf26a/staysnet/import/finance", importStaysNetFinance);
app.get("/make-server-67caf26a/staysnet/import/issues", listStaysNetImportIssues);
// ============================================================================

// ============================================================================
// STRIPE (Checkout + Webhooks + Products)
// ============================================================================
// Settings (multi-tenant via token): usado pelo modal de integrações no /settings
app.get("/rendizy-server/make-server-67caf26a/settings/stripe", stripeRoutes.getStripeConfig);
app.post("/rendizy-server/make-server-67caf26a/settings/stripe", stripeRoutes.saveStripeConfig);
app.post("/rendizy-server/make-server-67caf26a/settings/stripe/create-webhook", stripeRoutes.forceCreateWebhook);

// Checkout Session (P1)
app.post(
  "/rendizy-server/make-server-67caf26a/stripe/checkout/session",
  stripeRoutes.createStripeCheckoutSession
);

// Products & Prices (ATIVIDADE 02)
app.get("/rendizy-server/make-server-67caf26a/stripe/products", stripeRoutes.listStripeProducts);
app.post("/rendizy-server/make-server-67caf26a/stripe/products", stripeRoutes.createStripeProduct);
app.delete("/rendizy-server/make-server-67caf26a/stripe/products/:productId", stripeRoutes.archiveStripeProduct);

// Compat extra: alguns frontends chamam sem prefixo /rendizy-server
app.get("/make-server-67caf26a/settings/stripe", stripeRoutes.getStripeConfig);
app.post("/make-server-67caf26a/settings/stripe", stripeRoutes.saveStripeConfig);
app.post("/make-server-67caf26a/settings/stripe/create-webhook", stripeRoutes.forceCreateWebhook);
app.post("/make-server-67caf26a/stripe/checkout/session", stripeRoutes.createStripeCheckoutSession);
app.get("/make-server-67caf26a/stripe/products", stripeRoutes.listStripeProducts);
app.post("/make-server-67caf26a/stripe/products", stripeRoutes.createStripeProduct);
app.delete("/make-server-67caf26a/stripe/products/:productId", stripeRoutes.archiveStripeProduct);

// Webhook (externo): sem auth; valida assinatura + idempotência em stripe_webhook_events
app.post("/stripe/webhook/:organizationId", stripeRoutes.receiveStripeWebhook);
app.post("/rendizy-server/stripe/webhook/:organizationId", stripeRoutes.receiveStripeWebhook);

// ============================================================================

// ============================================================================
// PAYMENTS (Provider-agnostic checkout)
// ============================================================================
// Primary (used by internal app)
app.post(
  "/rendizy-server/make-server-67caf26a/payments/checkout/session",
  paymentsRoutes.createPaymentsCheckoutSession
);

// Compat extra: alguns frontends chamam sem prefixo /rendizy-server
app.post(
  "/make-server-67caf26a/payments/checkout/session",
  paymentsRoutes.createPaymentsCheckoutSession
);

// ============================================================================

// ============================================================================
// DATA RECONCILIATION (Campos reais para conciliação)
// ============================================================================
app.get(
  "/rendizy-server/make-server-67caf26a/data-reconciliation/stays/properties",
  dataReconciliationRoutes.getStaysProperties
);
app.post(
  "/rendizy-server/make-server-67caf26a/data-reconciliation/real-samples",
  dataReconciliationRoutes.getRealSamplesForReconciliation
);

// Compatibility (sem prefixo make-server)
app.get(
  "/rendizy-server/data-reconciliation/stays/properties",
  dataReconciliationRoutes.getStaysProperties
);
app.post(
  "/rendizy-server/data-reconciliation/real-samples",
  dataReconciliationRoutes.getRealSamplesForReconciliation
);

// Alias sem prefixo /rendizy-server (evita URL duplicada no client)
app.get(
  "/data-reconciliation/stays/properties",
  dataReconciliationRoutes.getStaysProperties
);
app.post(
  "/data-reconciliation/real-samples",
  dataReconciliationRoutes.getRealSamplesForReconciliation
);

// ============================================================================
// GUESTS (mínimo necessário para reservas)
// ============================================================================
// ⚠️ Guests dependem do tenancyMiddleware (getTenant/getOrganizationId)
app.get("/rendizy-server/guests", tenancyMiddleware, guestsRoutes.listGuests);
app.get("/rendizy-server/guests/global-search", tenancyMiddleware, guestsRoutes.globalSearchGuests);
app.post("/rendizy-server/guests/ensure", tenancyMiddleware, guestsRoutes.ensureGuestForOrganization);
app.get("/rendizy-server/guests/:id", tenancyMiddleware, guestsRoutes.getGuest);
app.post("/rendizy-server/guests", tenancyMiddleware, guestsRoutes.createGuest);
app.put("/rendizy-server/guests/:id", tenancyMiddleware, guestsRoutes.updateGuest);
app.delete("/rendizy-server/guests/:id", tenancyMiddleware, guestsRoutes.deleteGuest);

// Alias sem prefixo: base /functions/v1/rendizy-server
app.get("/guests", tenancyMiddleware, guestsRoutes.listGuests);
app.get("/guests/global-search", tenancyMiddleware, guestsRoutes.globalSearchGuests);
app.post("/guests/ensure", tenancyMiddleware, guestsRoutes.ensureGuestForOrganization);
app.get("/guests/:id", tenancyMiddleware, guestsRoutes.getGuest);
app.post("/guests", tenancyMiddleware, guestsRoutes.createGuest);
app.put("/guests/:id", tenancyMiddleware, guestsRoutes.updateGuest);
app.delete("/guests/:id", tenancyMiddleware, guestsRoutes.deleteGuest);

// ============================================================================
// CRON: Cancelar Reservas Pendentes Expiradas (Pré-Reservas)
// ============================================================================
// Chamado por cron externo (cron-job.org, GitHub Actions, ou Supabase pg_cron)
// Requer header: x-cron-secret ou apikey com service_role
app.post("/rendizy-server/cron/cancel-expired-pending", cronPendingReservationsRoutes.cancelExpiredPendingReservations);
app.post("/cron/cancel-expired-pending", cronPendingReservationsRoutes.cancelExpiredPendingReservations);
// Admin view: reservas próximas de expirar (para dashboard)
app.get("/rendizy-server/cron/pending-near-expiry", tenancyMiddleware, cronPendingReservationsRoutes.listPendingReservationsNearExpiry);
app.get("/cron/pending-near-expiry", tenancyMiddleware, cronPendingReservationsRoutes.listPendingReservationsNearExpiry);

// ============================================================================
// CRON: StaysNet Auto-Sync (CONSOLIDADO - ADR Edge Functions)
// ============================================================================
// ⚠️ IMPORTANTE: Estas rotas substituem as Edge Functions separadas:
//    - staysnet-properties-sync-cron -> /cron/staysnet-properties-sync
//    - staysnet-webhooks-cron -> /cron/staysnet-webhooks
// @see docs/ADR_EDGE_FUNCTIONS_ARQUITETURA_CENTRALIZADA.md
app.post("/rendizy-server/cron/staysnet-properties-sync", cronStaysnetRoutes.cronStaysnetPropertiesSync);
app.post("/cron/staysnet-properties-sync", cronStaysnetRoutes.cronStaysnetPropertiesSync);
app.post("/rendizy-server/cron/staysnet-webhooks", cronStaysnetRoutes.cronStaysnetWebhooks);
app.post("/cron/staysnet-webhooks", cronStaysnetRoutes.cronStaysnetWebhooks);

// ============================================================================
// CRON: Reconciliação Diária de Reservas
// ============================================================================
// Verifica reservas locais contra API da Stays.net e corrige divergências
// - Detecta reservas deletadas na Stays (cancela localmente)
// - Detecta alterações de status, datas, hóspede (atualiza localmente)
// - NOVO: Importa reservas faltantes (existem no Stays mas não no Rendizy)
// Executado às 05:00 BRT (08:00 UTC) diariamente via pg_cron
app.post("/rendizy-server/cron/staysnet-reservations-reconcile", cronReconciliationRoutes.cronStaysnetReservationsReconcile);
app.post("/cron/staysnet-reservations-reconcile", cronReconciliationRoutes.cronStaysnetReservationsReconcile);
app.post("/rendizy-server/cron/staysnet-import-missing", cronReconciliationRoutes.cronStaysnetImportMissing);
app.post("/cron/staysnet-import-missing", cronReconciliationRoutes.cronStaysnetImportMissing);
// Debug: verifica se uma reserva específica existe na Stays e/ou Rendizy
app.get("/rendizy-server/cron/staysnet-debug-missing", cronReconciliationRoutes.debugMissingReservation);
app.get("/cron/staysnet-debug-missing", cronReconciliationRoutes.debugMissingReservation);

// ============================================================================
// CALENDAR RULES BATCH (CONSOLIDADO - ADR Edge Functions)
// ============================================================================
// ⚠️ IMPORTANTE: Esta rota substitui a Edge Function separada:
//    - calendar-rules-batch -> /calendar-rules/batch
// @see docs/ADR_EDGE_FUNCTIONS_ARQUITETURA_CENTRALIZADA.md
app.get("/rendizy-server/calendar-rules/batch", calendarRulesBatchRoutes.calendarRulesBatchGet);
app.get("/calendar-rules/batch", calendarRulesBatchRoutes.calendarRulesBatchGet);
app.post("/rendizy-server/calendar-rules/batch", calendarRulesBatchRoutes.calendarRulesBatchPost);
app.post("/calendar-rules/batch", calendarRulesBatchRoutes.calendarRulesBatchPost);

// ============================================================================
// CALENDAR AVAILABILITY BATCH (V3 Rate Plans)
// ============================================================================
// ⚠️ Nova rota para escrita em rate_plan_availability + rate_plan_pricing_overrides
// Chamada por useCalendarAvailability.ts (substitui useCalendarPricingRules)
// @see docs/ADR_RATE_PLANS_CALENDAR_INTEGRATION.md
app.get("/rendizy-server/calendar-availability/batch", calendarAvailabilityBatchRoutes.calendarAvailabilityBatchGet);
app.get("/calendar-availability/batch", calendarAvailabilityBatchRoutes.calendarAvailabilityBatchGet);
app.post("/rendizy-server/calendar-availability/batch", calendarAvailabilityBatchRoutes.calendarAvailabilityBatchPost);
app.post("/calendar-availability/batch", calendarAvailabilityBatchRoutes.calendarAvailabilityBatchPost);

// ============================================================================
// AUTOMATIONS - Módulo de Automações com IA
// ============================================================================
// CRUD básico de automações
app.get("/rendizy-server/automations", tenancyMiddleware, automationsRoutes.listAutomations);
app.get("/rendizy-server/automations/:id", tenancyMiddleware, automationsRoutes.getAutomation);
app.post("/rendizy-server/automations", tenancyMiddleware, automationsRoutes.createAutomation);
app.put("/rendizy-server/automations/:id", tenancyMiddleware, automationsRoutes.updateAutomation);
app.patch("/rendizy-server/automations/:id/status", tenancyMiddleware, automationsRoutes.updateAutomationStatus);
app.delete("/rendizy-server/automations/:id", tenancyMiddleware, automationsRoutes.deleteAutomation);
app.get("/rendizy-server/automations/:id/executions", tenancyMiddleware, automationsRoutes.getAutomationExecutions);

// Alias sem prefixo /rendizy-server
app.get("/automations", tenancyMiddleware, automationsRoutes.listAutomations);
app.get("/automations/:id", tenancyMiddleware, automationsRoutes.getAutomation);
app.post("/automations", tenancyMiddleware, automationsRoutes.createAutomation);
app.put("/automations/:id", tenancyMiddleware, automationsRoutes.updateAutomation);
app.patch("/automations/:id/status", tenancyMiddleware, automationsRoutes.updateAutomationStatus);
app.delete("/automations/:id", tenancyMiddleware, automationsRoutes.deleteAutomation);
app.get("/automations/:id/executions", tenancyMiddleware, automationsRoutes.getAutomationExecutions);

// AI - Linguagem natural para automações
app.post("/rendizy-server/automations/ai/interpret", tenancyMiddleware, automationsAiRoutes.interpretAutomationNaturalLanguage);
app.post("/automations/ai/interpret", tenancyMiddleware, automationsAiRoutes.interpretAutomationNaturalLanguage);

// Trigger - Execução de automações
app.post("/rendizy-server/automations/trigger", tenancyMiddleware, automationsTriggerRoutes.triggerAutomation);
app.post("/rendizy-server/automations/trigger/message", tenancyMiddleware, automationsTriggerRoutes.triggerMessageAutomation);
app.post("/rendizy-server/automations/trigger/reservation", tenancyMiddleware, automationsTriggerRoutes.triggerReservationAutomation);
app.get("/rendizy-server/automations/test-trigger", automationsTriggerRoutes.testTrigger);

// Alias sem prefixo /rendizy-server
app.post("/automations/trigger", tenancyMiddleware, automationsTriggerRoutes.triggerAutomation);
app.post("/automations/trigger/message", tenancyMiddleware, automationsTriggerRoutes.triggerMessageAutomation);
app.post("/automations/trigger/reservation", tenancyMiddleware, automationsTriggerRoutes.triggerReservationAutomation);
app.get("/automations/test-trigger", automationsTriggerRoutes.testTrigger);

// ============================================================================
// 🔌 AI PROVIDER CONFIG - Configuração de provedores de IA (Groq, OpenAI, etc)
// ============================================================================
import * as aiProviderRoutes from "./routes-ai.ts";

// Com prefixo /rendizy-server E /make-server-67caf26a (compatibilidade)
app.get("/rendizy-server/make-server-67caf26a/integrations/ai/config", tenancyMiddleware, aiProviderRoutes.getAIProviderConfig);
app.get("/rendizy-server/make-server-67caf26a/integrations/ai/configs", tenancyMiddleware, aiProviderRoutes.listAIProviderConfigs);
app.put("/rendizy-server/make-server-67caf26a/integrations/ai/config", tenancyMiddleware, aiProviderRoutes.upsertAIProviderConfig);
app.patch("/rendizy-server/make-server-67caf26a/integrations/ai/config/:id/status", tenancyMiddleware, aiProviderRoutes.toggleAIConfigStatus);
app.delete("/rendizy-server/make-server-67caf26a/integrations/ai/config/:id", tenancyMiddleware, aiProviderRoutes.deleteAIProviderConfig);
app.post("/rendizy-server/make-server-67caf26a/integrations/ai/test", tenancyMiddleware, aiProviderRoutes.testAIProviderConfig);

// Rotas espelho sem /make-server-67caf26a
app.get("/rendizy-server/integrations/ai/config", tenancyMiddleware, aiProviderRoutes.getAIProviderConfig);
app.get("/rendizy-server/integrations/ai/configs", tenancyMiddleware, aiProviderRoutes.listAIProviderConfigs);
app.put("/rendizy-server/integrations/ai/config", tenancyMiddleware, aiProviderRoutes.upsertAIProviderConfig);
app.patch("/rendizy-server/integrations/ai/config/:id/status", tenancyMiddleware, aiProviderRoutes.toggleAIConfigStatus);
app.delete("/rendizy-server/integrations/ai/config/:id", tenancyMiddleware, aiProviderRoutes.deleteAIProviderConfig);
app.post("/rendizy-server/integrations/ai/test", tenancyMiddleware, aiProviderRoutes.testAIProviderConfig);

// Alias sem prefixo /rendizy-server
app.get("/integrations/ai/config", tenancyMiddleware, aiProviderRoutes.getAIProviderConfig);
app.get("/integrations/ai/configs", tenancyMiddleware, aiProviderRoutes.listAIProviderConfigs);
app.put("/integrations/ai/config", tenancyMiddleware, aiProviderRoutes.upsertAIProviderConfig);
app.patch("/integrations/ai/config/:id/status", tenancyMiddleware, aiProviderRoutes.toggleAIConfigStatus);
app.delete("/integrations/ai/config/:id", tenancyMiddleware, aiProviderRoutes.deleteAIProviderConfig);
app.post("/integrations/ai/test", tenancyMiddleware, aiProviderRoutes.testAIProviderConfig);

// ============================================================================
// 🤖 AI AGENTS - Agentes de IA para coleta automatizada
// ============================================================================
// Coletor de Construtoras - Scraping de Linktrees com IA
app.route("/rendizy-server/ai-agents", aiAgentsApp);
app.route("/ai-agents", aiAgentsApp);

// ============================================================================
// 📊 CRM MODULAR - VENDAS (SALES)
// Funis de vendas + Deals (cards de vendas)
// ============================================================================
// Funis
app.get("/rendizy-server/crm/sales/funnels", tenancyMiddleware, salesRoutes.listSalesFunnels);
app.get("/rendizy-server/crm/sales/funnels/:id", tenancyMiddleware, salesRoutes.getSalesFunnel);
app.post("/rendizy-server/crm/sales/funnels", tenancyMiddleware, salesRoutes.createSalesFunnel);
app.put("/rendizy-server/crm/sales/funnels/:id", tenancyMiddleware, salesRoutes.updateSalesFunnel);
app.delete("/rendizy-server/crm/sales/funnels/:id", tenancyMiddleware, salesRoutes.deleteSalesFunnel);
// Deals
app.get("/rendizy-server/crm/sales/deals", tenancyMiddleware, salesRoutes.listSalesDeals);
app.get("/rendizy-server/crm/sales/deals/:id", tenancyMiddleware, salesRoutes.getSalesDeal);
app.post("/rendizy-server/crm/sales/deals", tenancyMiddleware, salesRoutes.createSalesDeal);
app.put("/rendizy-server/crm/sales/deals/:id", tenancyMiddleware, salesRoutes.updateSalesDeal);
app.delete("/rendizy-server/crm/sales/deals/:id", tenancyMiddleware, salesRoutes.deleteSalesDeal);
app.post("/rendizy-server/crm/sales/deals/:id/move", tenancyMiddleware, salesRoutes.moveSalesDeal);
// Stats
app.get("/rendizy-server/crm/sales/stats", tenancyMiddleware, salesRoutes.getSalesStats);
// Aliases sem prefixo
app.get("/crm/sales/funnels", tenancyMiddleware, salesRoutes.listSalesFunnels);
app.get("/crm/sales/funnels/:id", tenancyMiddleware, salesRoutes.getSalesFunnel);
app.post("/crm/sales/funnels", tenancyMiddleware, salesRoutes.createSalesFunnel);
app.put("/crm/sales/funnels/:id", tenancyMiddleware, salesRoutes.updateSalesFunnel);
app.delete("/crm/sales/funnels/:id", tenancyMiddleware, salesRoutes.deleteSalesFunnel);
app.get("/crm/sales/deals", tenancyMiddleware, salesRoutes.listSalesDeals);
app.get("/crm/sales/deals/:id", tenancyMiddleware, salesRoutes.getSalesDeal);
app.post("/crm/sales/deals", tenancyMiddleware, salesRoutes.createSalesDeal);
app.put("/crm/sales/deals/:id", tenancyMiddleware, salesRoutes.updateSalesDeal);
app.delete("/crm/sales/deals/:id", tenancyMiddleware, salesRoutes.deleteSalesDeal);
app.post("/crm/sales/deals/:id/move", tenancyMiddleware, salesRoutes.moveSalesDeal);
app.get("/crm/sales/stats", tenancyMiddleware, salesRoutes.getSalesStats);

// ============================================================================
// 📊 CRM MODULAR - SERVIÇOS (SERVICES)
// Funis de serviços + Tickets (cards de atendimento)
// ============================================================================
// Funis
app.get("/rendizy-server/crm/services/funnels", tenancyMiddleware, servicesRoutes.listServiceFunnels);
app.get("/rendizy-server/crm/services/funnels/:id", tenancyMiddleware, servicesRoutes.getServiceFunnel);
app.post("/rendizy-server/crm/services/funnels", tenancyMiddleware, servicesRoutes.createServiceFunnel);
app.put("/rendizy-server/crm/services/funnels/:id", tenancyMiddleware, servicesRoutes.updateServiceFunnel);
app.delete("/rendizy-server/crm/services/funnels/:id", tenancyMiddleware, servicesRoutes.deleteServiceFunnel);
// Tickets
app.get("/rendizy-server/crm/services/tickets", tenancyMiddleware, servicesRoutes.listServiceTickets);
app.get("/rendizy-server/crm/services/tickets/:id", tenancyMiddleware, servicesRoutes.getServiceTicket);
app.post("/rendizy-server/crm/services/tickets", tenancyMiddleware, servicesRoutes.createServiceTicket);
app.put("/rendizy-server/crm/services/tickets/:id", tenancyMiddleware, servicesRoutes.updateServiceTicket);
app.delete("/rendizy-server/crm/services/tickets/:id", tenancyMiddleware, servicesRoutes.deleteServiceTicket);
app.post("/rendizy-server/crm/services/tickets/:id/move", tenancyMiddleware, servicesRoutes.moveServiceTicket);
// Stats
app.get("/rendizy-server/crm/services/stats", tenancyMiddleware, servicesRoutes.getServiceStats);
// Aliases sem prefixo
app.get("/crm/services/funnels", tenancyMiddleware, servicesRoutes.listServiceFunnels);
app.get("/crm/services/funnels/:id", tenancyMiddleware, servicesRoutes.getServiceFunnel);
app.post("/crm/services/funnels", tenancyMiddleware, servicesRoutes.createServiceFunnel);
app.put("/crm/services/funnels/:id", tenancyMiddleware, servicesRoutes.updateServiceFunnel);
app.delete("/crm/services/funnels/:id", tenancyMiddleware, servicesRoutes.deleteServiceFunnel);
app.get("/crm/services/tickets", tenancyMiddleware, servicesRoutes.listServiceTickets);
app.get("/crm/services/tickets/:id", tenancyMiddleware, servicesRoutes.getServiceTicket);
app.post("/crm/services/tickets", tenancyMiddleware, servicesRoutes.createServiceTicket);
app.put("/crm/services/tickets/:id", tenancyMiddleware, servicesRoutes.updateServiceTicket);
app.delete("/crm/services/tickets/:id", tenancyMiddleware, servicesRoutes.deleteServiceTicket);
app.post("/crm/services/tickets/:id/move", tenancyMiddleware, servicesRoutes.moveServiceTicket);
app.get("/crm/services/stats", tenancyMiddleware, servicesRoutes.getServiceStats);

// ============================================================================
// 📊 CRM MODULAR - PRÉ-DETERMINADOS (PREDETERMINED)
// Funis de workflow + Items (cards de workflow)
// ============================================================================
// Funis
app.get("/rendizy-server/crm/predetermined/funnels", tenancyMiddleware, predeterminedRoutes.listPredeterminedFunnels);
app.get("/rendizy-server/crm/predetermined/funnels/:id", tenancyMiddleware, predeterminedRoutes.getPredeterminedFunnel);
app.post("/rendizy-server/crm/predetermined/funnels", tenancyMiddleware, predeterminedRoutes.createPredeterminedFunnel);
app.put("/rendizy-server/crm/predetermined/funnels/:id", tenancyMiddleware, predeterminedRoutes.updatePredeterminedFunnel);
app.delete("/rendizy-server/crm/predetermined/funnels/:id", tenancyMiddleware, predeterminedRoutes.deletePredeterminedFunnel);
// Items
app.get("/rendizy-server/crm/predetermined/items", tenancyMiddleware, predeterminedRoutes.listPredeterminedItems);
app.get("/rendizy-server/crm/predetermined/items/:id", tenancyMiddleware, predeterminedRoutes.getPredeterminedItem);
app.post("/rendizy-server/crm/predetermined/items", tenancyMiddleware, predeterminedRoutes.createPredeterminedItem);
app.put("/rendizy-server/crm/predetermined/items/:id", tenancyMiddleware, predeterminedRoutes.updatePredeterminedItem);
app.delete("/rendizy-server/crm/predetermined/items/:id", tenancyMiddleware, predeterminedRoutes.deletePredeterminedItem);
app.post("/rendizy-server/crm/predetermined/items/:id/move", tenancyMiddleware, predeterminedRoutes.movePredeterminedItem);
app.patch("/rendizy-server/crm/predetermined/items/:id/checklist", tenancyMiddleware, predeterminedRoutes.updatePredeterminedItemChecklist);
// Stats
app.get("/rendizy-server/crm/predetermined/stats", tenancyMiddleware, predeterminedRoutes.getPredeterminedStats);
// Aliases sem prefixo
app.get("/crm/predetermined/funnels", tenancyMiddleware, predeterminedRoutes.listPredeterminedFunnels);
app.get("/crm/predetermined/funnels/:id", tenancyMiddleware, predeterminedRoutes.getPredeterminedFunnel);
app.post("/crm/predetermined/funnels", tenancyMiddleware, predeterminedRoutes.createPredeterminedFunnel);
app.put("/crm/predetermined/funnels/:id", tenancyMiddleware, predeterminedRoutes.updatePredeterminedFunnel);
app.delete("/crm/predetermined/funnels/:id", tenancyMiddleware, predeterminedRoutes.deletePredeterminedFunnel);
app.get("/crm/predetermined/items", tenancyMiddleware, predeterminedRoutes.listPredeterminedItems);
app.get("/crm/predetermined/items/:id", tenancyMiddleware, predeterminedRoutes.getPredeterminedItem);
app.post("/crm/predetermined/items", tenancyMiddleware, predeterminedRoutes.createPredeterminedItem);
app.put("/crm/predetermined/items/:id", tenancyMiddleware, predeterminedRoutes.updatePredeterminedItem);
app.delete("/crm/predetermined/items/:id", tenancyMiddleware, predeterminedRoutes.deletePredeterminedItem);
app.post("/crm/predetermined/items/:id/move", tenancyMiddleware, predeterminedRoutes.movePredeterminedItem);
app.patch("/crm/predetermined/items/:id/checklist", tenancyMiddleware, predeterminedRoutes.updatePredeterminedItemChecklist);
app.get("/crm/predetermined/stats", tenancyMiddleware, predeterminedRoutes.getPredeterminedStats);

// ============================================================================
// 📊 CRM MODULAR - CONTACTS (Contatos/Pessoas)
// Cadastro de pessoas/contatos do CRM
// ============================================================================
app.get("/rendizy-server/crm/contacts", tenancyMiddleware, crmContactsRoutes.listContacts);
app.get("/rendizy-server/crm/contacts/search", tenancyMiddleware, crmContactsRoutes.searchContacts);
app.get("/rendizy-server/crm/contacts/:id", tenancyMiddleware, crmContactsRoutes.getContact);
app.post("/rendizy-server/crm/contacts", tenancyMiddleware, crmContactsRoutes.createContact);
app.put("/rendizy-server/crm/contacts/:id", tenancyMiddleware, crmContactsRoutes.updateContact);
app.delete("/rendizy-server/crm/contacts/:id", tenancyMiddleware, crmContactsRoutes.deleteContact);
app.get("/rendizy-server/crm/contacts/:id/deals", tenancyMiddleware, crmContactsRoutes.getContactDeals);
app.get("/rendizy-server/crm/contacts/:id/notes", tenancyMiddleware, crmContactsRoutes.getContactNotes);
// Aliases sem prefixo
app.get("/crm/contacts", tenancyMiddleware, crmContactsRoutes.listContacts);
app.get("/crm/contacts/search", tenancyMiddleware, crmContactsRoutes.searchContacts);
app.get("/crm/contacts/:id", tenancyMiddleware, crmContactsRoutes.getContact);
app.post("/crm/contacts", tenancyMiddleware, crmContactsRoutes.createContact);
app.put("/crm/contacts/:id", tenancyMiddleware, crmContactsRoutes.updateContact);
app.delete("/crm/contacts/:id", tenancyMiddleware, crmContactsRoutes.deleteContact);
app.get("/crm/contacts/:id/deals", tenancyMiddleware, crmContactsRoutes.getContactDeals);
app.get("/crm/contacts/:id/notes", tenancyMiddleware, crmContactsRoutes.getContactNotes);

// ============================================================================
// 📊 CRM MODULAR - COMPANIES (Empresas)
// Cadastro de empresas/organizações do CRM
// ============================================================================
app.get("/rendizy-server/crm/companies", tenancyMiddleware, crmCompaniesRoutes.listCompanies);
app.get("/rendizy-server/crm/companies/search", tenancyMiddleware, crmCompaniesRoutes.searchCompanies);
app.get("/rendizy-server/crm/companies/:id", tenancyMiddleware, crmCompaniesRoutes.getCompany);
app.post("/rendizy-server/crm/companies", tenancyMiddleware, crmCompaniesRoutes.createCompany);
app.put("/rendizy-server/crm/companies/:id", tenancyMiddleware, crmCompaniesRoutes.updateCompany);
app.delete("/rendizy-server/crm/companies/:id", tenancyMiddleware, crmCompaniesRoutes.deleteCompany);
app.get("/rendizy-server/crm/companies/:id/contacts", tenancyMiddleware, crmCompaniesRoutes.getCompanyContacts);
app.get("/rendizy-server/crm/companies/:id/deals", tenancyMiddleware, crmCompaniesRoutes.getCompanyDeals);
// Aliases sem prefixo
app.get("/crm/companies", tenancyMiddleware, crmCompaniesRoutes.listCompanies);
app.get("/crm/companies/search", tenancyMiddleware, crmCompaniesRoutes.searchCompanies);
app.get("/crm/companies/:id", tenancyMiddleware, crmCompaniesRoutes.getCompany);
app.post("/crm/companies", tenancyMiddleware, crmCompaniesRoutes.createCompany);
app.put("/crm/companies/:id", tenancyMiddleware, crmCompaniesRoutes.updateCompany);
app.delete("/crm/companies/:id", tenancyMiddleware, crmCompaniesRoutes.deleteCompany);
app.get("/crm/companies/:id/contacts", tenancyMiddleware, crmCompaniesRoutes.getCompanyContacts);
app.get("/crm/companies/:id/deals", tenancyMiddleware, crmCompaniesRoutes.getCompanyDeals);

// ============================================================================
// 📊 CRM MODULAR - NOTES (Observações)
// Histórico de notas vinculadas a entidades
// ============================================================================
app.get("/rendizy-server/crm/notes", tenancyMiddleware, crmNotesRoutes.listNotes);
app.get("/rendizy-server/crm/notes/:id", tenancyMiddleware, crmNotesRoutes.getNote);
app.post("/rendizy-server/crm/notes", tenancyMiddleware, crmNotesRoutes.createNote);
app.put("/rendizy-server/crm/notes/:id", tenancyMiddleware, crmNotesRoutes.updateNote);
app.delete("/rendizy-server/crm/notes/:id", tenancyMiddleware, crmNotesRoutes.deleteNote);
// Aliases sem prefixo
app.get("/crm/notes", tenancyMiddleware, crmNotesRoutes.listNotes);
app.get("/crm/notes/:id", tenancyMiddleware, crmNotesRoutes.getNote);
app.post("/crm/notes", tenancyMiddleware, crmNotesRoutes.createNote);
app.put("/crm/notes/:id", tenancyMiddleware, crmNotesRoutes.updateNote);
app.delete("/crm/notes/:id", tenancyMiddleware, crmNotesRoutes.deleteNote);

// ============================================================================
// ✅ CRM MODULAR - TASKS (Tarefas/Atividades)
// Gestão de tarefas vinculadas a deals, tickets, contatos, etc.
// ============================================================================
app.get("/rendizy-server/crm/tasks", tenancyMiddleware, crmTasksRoutes.listTasks);
app.get("/rendizy-server/crm/tasks/my", tenancyMiddleware, crmTasksRoutes.getMyTasks);
app.get("/rendizy-server/crm/tasks/stats", tenancyMiddleware, crmTasksRoutes.getTaskStats);
app.get("/rendizy-server/crm/tasks/:id", tenancyMiddleware, crmTasksRoutes.getTask);
app.post("/rendizy-server/crm/tasks", tenancyMiddleware, crmTasksRoutes.createTask);
app.put("/rendizy-server/crm/tasks/:id", tenancyMiddleware, crmTasksRoutes.updateTask);
app.delete("/rendizy-server/crm/tasks/:id", tenancyMiddleware, crmTasksRoutes.deleteTask);
app.patch("/rendizy-server/crm/tasks/:id/complete", tenancyMiddleware, crmTasksRoutes.completeTask);
// Aliases sem prefixo
app.get("/crm/tasks", tenancyMiddleware, crmTasksRoutes.listTasks);
app.get("/crm/tasks/my", tenancyMiddleware, crmTasksRoutes.getMyTasks);
app.get("/crm/tasks/stats", tenancyMiddleware, crmTasksRoutes.getTaskStats);
app.get("/crm/tasks/:id", tenancyMiddleware, crmTasksRoutes.getTask);
app.post("/crm/tasks", tenancyMiddleware, crmTasksRoutes.createTask);
app.put("/crm/tasks/:id", tenancyMiddleware, crmTasksRoutes.updateTask);
app.delete("/crm/tasks/:id", tenancyMiddleware, crmTasksRoutes.deleteTask);
app.patch("/crm/tasks/:id/complete", tenancyMiddleware, crmTasksRoutes.completeTask);

// ============================================================================
// 📬 NOTIFICATION PROVIDERS - Configuração de canais de notificação
// Resend, Brevo, Evolution API, etc.
// ============================================================================
app.get("/rendizy-server/notifications/providers", tenancyMiddleware, notificationProvidersRoutes.listNotificationProviders);
app.get("/rendizy-server/notifications/providers/:channel", tenancyMiddleware, notificationProvidersRoutes.getProviderConfig);
app.post("/rendizy-server/notifications/providers", tenancyMiddleware, notificationProvidersRoutes.saveProviderConfig);
app.delete("/rendizy-server/notifications/providers/:channel/:provider", tenancyMiddleware, notificationProvidersRoutes.deleteProviderConfig);
app.post("/rendizy-server/notifications/providers/test", tenancyMiddleware, notificationProvidersRoutes.testProviderSend);
// Aliases sem prefixo
app.get("/notifications/providers", tenancyMiddleware, notificationProvidersRoutes.listNotificationProviders);
app.get("/notifications/providers/:channel", tenancyMiddleware, notificationProvidersRoutes.getProviderConfig);
app.post("/notifications/providers", tenancyMiddleware, notificationProvidersRoutes.saveProviderConfig);
app.delete("/notifications/providers/:channel/:provider", tenancyMiddleware, notificationProvidersRoutes.deleteProviderConfig);
app.post("/notifications/providers/test", tenancyMiddleware, notificationProvidersRoutes.testProviderSend);

// ============================================================================
// 📝 NOTIFICATION TEMPLATES - Templates de notificação multi-canal
// ============================================================================
app.get("/rendizy-server/notifications/templates", tenancyMiddleware, notificationTemplatesRoutes.listTemplates);
app.get("/rendizy-server/notifications/templates/:id", tenancyMiddleware, notificationTemplatesRoutes.getTemplate);
app.post("/rendizy-server/notifications/templates", tenancyMiddleware, notificationTemplatesRoutes.createTemplate);
app.put("/rendizy-server/notifications/templates/:id", tenancyMiddleware, notificationTemplatesRoutes.updateTemplate);
app.delete("/rendizy-server/notifications/templates/:id", tenancyMiddleware, notificationTemplatesRoutes.deleteTemplate);
app.patch("/rendizy-server/notifications/templates/:id/status", tenancyMiddleware, notificationTemplatesRoutes.toggleTemplateStatus);
app.post("/rendizy-server/notifications/templates/:id/duplicate", tenancyMiddleware, notificationTemplatesRoutes.duplicateTemplate);
app.get("/rendizy-server/notifications/triggers", tenancyMiddleware, notificationTemplatesRoutes.listTriggerTypes);
app.post("/rendizy-server/notifications/templates/preview", tenancyMiddleware, notificationTemplatesRoutes.previewTemplate);
app.post("/rendizy-server/notifications/templates/:id/test", tenancyMiddleware, notificationTemplatesRoutes.testTemplateDelivery);
// Aliases sem prefixo
app.get("/notifications/templates", tenancyMiddleware, notificationTemplatesRoutes.listTemplates);
app.get("/notifications/templates/:id", tenancyMiddleware, notificationTemplatesRoutes.getTemplate);
app.post("/notifications/templates", tenancyMiddleware, notificationTemplatesRoutes.createTemplate);
app.put("/notifications/templates/:id", tenancyMiddleware, notificationTemplatesRoutes.updateTemplate);
app.delete("/notifications/templates/:id", tenancyMiddleware, notificationTemplatesRoutes.deleteTemplate);
app.patch("/notifications/templates/:id/status", tenancyMiddleware, notificationTemplatesRoutes.toggleTemplateStatus);
app.post("/notifications/templates/:id/duplicate", tenancyMiddleware, notificationTemplatesRoutes.duplicateTemplate);
app.get("/notifications/triggers", tenancyMiddleware, notificationTemplatesRoutes.listTriggerTypes);
app.post("/notifications/templates/preview", tenancyMiddleware, notificationTemplatesRoutes.previewTemplate);
app.post("/notifications/templates/:id/test", tenancyMiddleware, notificationTemplatesRoutes.testTemplateDelivery);

// ============================================================================
// DEFAULT HANDLERS
// ============================================================================
app.notFound((c) => withCorsJson(c, { message: "Not Found" }));

app.onError((err, c) => {
  console.error("Unhandled error:", err);
  const anyErr = err as any;
  const status = typeof anyErr?.status === 'number' ? anyErr.status : undefined;
  if (status && status >= 400 && status < 600) {
    c.status(status);
    return withCorsJson(c, {
      error: anyErr?.message || 'Error',
      ...(anyErr?.details ? { details: anyErr.details } : {}),
    });
  }
  c.status(500);
  return withCorsJson(c, { error: "Internal Server Error" });
});

// ============================================================================
// 🛡️ CAMADA 2: SERVIDOR COM CORS ISOLADO (PROTEÇÃO DEFINITIVA)
// ============================================================================
// ⚠️ CRITICAL: CORS é tratado ANTES do app Hono processar qualquer request
// 
// OBJETIVO: Mesmo se app.fetch() crashar, CORS continua funcionando
// 
// FLUXO:
// 1. Request OPTIONS → Retorna 204 IMEDIATAMENTE (sem tocar no app)
// 2. Outras requests → Try-catch garante resposta com CORS mesmo em erro
//
// REFERÊNCIA: docs/architecture/BLINDAGEM_MODULAR_ANTI_REGRESSAO.md
// ============================================================================
Deno.serve(async (req) => {
  // ========================================
  // CAMADA 1: CORS PREFLIGHT (SEMPRE FUNCIONA)
  // ========================================
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, apikey, X-Auth-Token, x-client-info, Prefer, x-organization-id",
        "Access-Control-Max-Age": "86400",
      }
    });
  }

  // ========================================
  // CAMADA 2: APP HONO COM PROTEÇÃO DE ERRO
  // ========================================
  try {
    return await app.fetch(req);
  } catch (error) {
    console.error("🔥 ERRO CRÍTICO NO APP:", error);
    const anyError = error as any;
    // Garantir que CORS funciona mesmo em crash total
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error", 
        message: anyError?.message,
        hint: "Check server logs for details"
      }), 
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, apikey, X-Auth-Token, x-organization-id",
        }
      }
    );
  }
});
