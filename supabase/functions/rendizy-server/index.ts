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
import { tenancyMiddleware } from "./utils-tenancy.ts";
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

const app = new Hono();

// ============================================================================
// HEALTH CHECK (frontend usa: GET /health)
// ============================================================================
function withCorsJson(c: any, payload: unknown) {
  // Esses handlers ficam ANTES do middleware global; então setamos CORS aqui também.
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, apikey, X-Auth-Token");
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
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, apikey, X-Auth-Token");
  c.header("Access-Control-Max-Age", "86400");
  
  // Handle preflight - retornar IMEDIATAMENTE sem processar mais nada
  if (c.req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, apikey, X-Auth-Token",
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

// ============================================================================
// ANÚNCIOS ULTIMATE (Properties Drafts/Publishing)
// ============================================================================
app.route("/rendizy-server/anuncios-ultimate", anunciosApp);

// ============================================================================
// CLIENT SITES (Sites dos Clientes)
// ============================================================================
app.route("/rendizy-server/client-sites", clientSitesApp);
app.route("/rendizy-server/make-server-67caf26a/client-sites", clientSitesApp); // compat

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
// ⚡ STAYSNET IMPORT MODULAR (v1.0.104) - Separado por entidade
// ============================================================================
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/properties", importStaysNetProperties); // 🏠 Properties → anuncios_ultimate
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/reservations", importStaysNetReservations); // 🏨 Reservations → reservations
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/guests", importStaysNetGuests); // 👤 Guests → guests
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/blocks", importStaysNetBlocks); // ⛔ Blocks → blocks
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/finance", importStaysNetFinance); // 💰 Finance RAW → staysnet_raw_objects
app.get("/rendizy-server/make-server-67caf26a/staysnet/import/issues", listStaysNetImportIssues); // ⚠️ Issues abertas (ex: missing property mapping)
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
app.get("/rendizy-server/guests/:id", tenancyMiddleware, guestsRoutes.getGuest);
app.post("/rendizy-server/guests", tenancyMiddleware, guestsRoutes.createGuest);
app.put("/rendizy-server/guests/:id", tenancyMiddleware, guestsRoutes.updateGuest);
app.delete("/rendizy-server/guests/:id", tenancyMiddleware, guestsRoutes.deleteGuest);

// Alias sem prefixo: base /functions/v1/rendizy-server
app.get("/guests", tenancyMiddleware, guestsRoutes.listGuests);
app.get("/guests/:id", tenancyMiddleware, guestsRoutes.getGuest);
app.post("/guests", tenancyMiddleware, guestsRoutes.createGuest);
app.put("/guests/:id", tenancyMiddleware, guestsRoutes.updateGuest);
app.delete("/guests/:id", tenancyMiddleware, guestsRoutes.deleteGuest);

// ============================================================================
// DEFAULT HANDLERS
// ============================================================================
app.notFound((c) => c.json({ message: "Not Found" }, 404));

app.onError((err, c) => {
  console.error("Unhandled error:", err);
  const anyErr = err as any;
  const status = typeof anyErr?.status === 'number' ? anyErr.status : undefined;
  if (status && status >= 400 && status < 600) {
    return c.json(
      {
        error: anyErr?.message || 'Error',
        ...(anyErr?.details ? { details: anyErr.details } : {}),
      },
      status
    );
  }
  return c.json({ error: "Internal Server Error" }, 500);
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
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, apikey, X-Auth-Token",
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
