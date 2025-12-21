// Rendizy Backend API - Main Entry Point (cápsula mínima)
import { Hono } from "npm:hono";
import { logger } from "npm:hono/logger";

// Rotas essenciais habilitadas
import authApp from "./routes-auth.ts";
import anunciosApp from "./routes-anuncios.ts";
import * as reservationsRoutes from "./routes-reservations.ts";
import * as calendarRoutes from "./routes-calendar.ts";
import blocksApp from "./routes-blocks.ts";
import * as guestsRoutes from "./routes-guests.ts";
import * as staysnetRoutes from "./routes-staysnet.ts";

const app = new Hono();

// CORS simples antes de tudo
app.use("/*", async (c, next) => {
  if (c.req.method === "OPTIONS") {
    c.header("Access-Control-Allow-Origin", "*");
    c.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD"
    );
    c.header(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, apikey, X-Auth-Token"
    );
    return c.body(null, 204);
  }

  await next();

  c.header("Access-Control-Allow-Origin", "*");
  c.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD"
  );
  c.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, apikey, X-Auth-Token"
  );
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
// RESERVATIONS
// ============================================================================
app.get("/rendizy-server/reservations", reservationsRoutes.listReservations);
app.get("/rendizy-server/reservations/:id", reservationsRoutes.getReservation);
app.post("/rendizy-server/reservations", reservationsRoutes.createReservation);
app.put("/rendizy-server/reservations/:id", reservationsRoutes.updateReservation);
app.delete("/rendizy-server/reservations/:id", reservationsRoutes.deleteReservation);

// ============================================================================
// CALENDAR / BLOCKS
// ============================================================================
app.get("/rendizy-server/calendar/blocks", calendarRoutes.getBlocks);
app.post("/rendizy-server/calendar/blocks", calendarRoutes.createBlock);
app.delete("/rendizy-server/calendar/blocks/:id", calendarRoutes.deleteBlock);

// ============================================================================
// BLOCKS LEGACY ROUTER (compat)
// ============================================================================
app.route("/rendizy-server/blocks", blocksApp);

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
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/preview", staysnetRoutes.previewStaysNetImport);
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/full", staysnetRoutes.importFullStaysNet);
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/reservations", staysnetRoutes.importStaysNetReservations);
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/guests", staysnetRoutes.importStaysNetGuests);

// ============================================================================
// GUESTS (mínimo necessário para reservas)
// ============================================================================
app.get("/rendizy-server/guests", guestsRoutes.listGuests);
app.get("/rendizy-server/guests/:id", guestsRoutes.getGuest);
app.post("/rendizy-server/guests", guestsRoutes.createGuest);
app.put("/rendizy-server/guests/:id", guestsRoutes.updateGuest);
app.delete("/rendizy-server/guests/:id", guestsRoutes.deleteGuest);

// ============================================================================
// DEFAULT HANDLERS
// ============================================================================
app.notFound((c) => c.json({ message: "Not Found" }, 404));

app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
});

Deno.serve((req) => app.fetch(req));
