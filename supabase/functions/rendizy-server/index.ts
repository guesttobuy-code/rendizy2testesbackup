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
import anunciosApp from "./routes-anuncios.ts";
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
import * as currencySettingsRoutes from "./routes-currency-settings.ts";
import { registerDiscountPackagesRoutes } from "./routes-discount-packages.ts";
import * as organizationsRoutes from "./routes-organizations.ts";
import usersApp from "./routes-users.ts";
import ownersApp from "./routes-owners.ts";
import * as photosRoutes from "./routes-photos.ts";
import * as stripeRoutes from "./routes-stripe.ts";
import * as paymentsRoutes from "./routes-payments.ts";
import * as cronPendingReservationsRoutes from "./routes-cron-pending-reservations.ts"; // ✅ CRON: Cancelar pendentes expiradas
import * as cronStaysnetRoutes from "./routes-cron-staysnet.ts"; // ✅ CRON: StaysNet sync (consolidado ADR)
import * as authSocialRoutes from "./routes-auth-social.ts"; // ✅ OAuth: Login Google/Apple
import * as calendarRulesBatchRoutes from "./routes-calendar-rules-batch.ts"; // ✅ Batch rules (migrado ADR)
import { guestAreaApp } from "./routes-guest-area.ts"; // 🏠 CÁPSULA: Área do Hóspede

const app = new Hono();

// ============================================================================
// HEALTH CHECK (frontend usa: GET /health)
// ============================================================================
function withCorsJson(c: any, payload: unknown) {
  // Esses handlers ficam ANTES do middleware global; então setamos CORS aqui também.
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, apikey, X-Auth-Token, x-client-info, Prefer");
  c.header("Access-Control-Max-Age", "86400");
  return c.json(payload);
}

app.get("/health", (c) => withCorsJson(c, { ok: true }));
// Compat: alguns clients chamam com prefixo /rendizy-server
app.get("/rendizy-server/health", (c) => withCorsJson(c, { ok: true }));

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
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, apikey, X-Auth-Token, x-client-info, Prefer");
  c.header("Access-Control-Max-Age", "86400");
  
  // Handle preflight - retornar IMEDIATAMENTE sem processar mais nada
  if (c.req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, apikey, X-Auth-Token, x-client-info, Prefer",
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
// ANÚNCIOS ULTIMATE (Properties Drafts/Publishing)
// ============================================================================
// URL CANÔNICA (externa): /functions/v1/rendizy-server/anuncios-ultimate/*
// OBS: em produção, o pathname recebido pelo Hono inclui o nome da function como prefixo.
// Então montamos o módulo em /rendizy-server/anuncios-ultimate/* para bater com:
// /functions/v1/rendizy-server/anuncios-ultimate/*
app.route("/rendizy-server/anuncios-ultimate", anunciosApp);

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
app.post("/staysnet/webhook/:organizationId", staysnetWebhooksRoutes.receiveStaysNetWebhook);
app.post("/rendizy-server/staysnet/webhook/:organizationId", staysnetWebhooksRoutes.receiveStaysNetWebhook);
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
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, apikey, X-Auth-Token, x-client-info, Prefer",
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
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, apikey, X-Auth-Token",
        }
      }
    );
  }
});
