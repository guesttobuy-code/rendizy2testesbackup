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
import { cors } from "npm:hono/cors";
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
import * as reservationsRoutes from "./routes-reservations.ts";
import * as calendarRoutes from "./routes-calendar.ts";
import blocksApp from "./routes-blocks.ts";
import * as guestsRoutes from "./routes-guests.ts";
import * as staysnetRoutes from "./routes-staysnet.ts";
import { tenancyMiddleware } from "./utils-tenancy.ts";
import { importStaysNetSimple } from "./import-staysnet-simple.ts";
import { importStaysNetRPC } from "./import-staysnet-RPC.ts"; // ✅ Adicionado 23/12/2025
import { importStaysNetProperties } from "./import-staysnet-properties.ts"; // ✅ MODULAR: Properties separadas
import { importStaysNetReservations } from "./import-staysnet-reservations.ts"; // ✅ MODULAR: Reservations separadas
import { importStaysNetGuests } from "./import-staysnet-guests.ts"; // ✅ MODULAR: Guests separados
import { importStaysNetBlocks } from "./import-staysnet-blocks.ts"; // ✅ MODULAR: Blocks separadas

const app = new Hono();

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
  
  await next();
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
app.get("/rendizy-server/reservations", tenancyMiddleware, reservationsRoutes.listReservations);
app.get("/rendizy-server/reservations/:id", tenancyMiddleware, reservationsRoutes.getReservation);
app.post("/rendizy-server/reservations", tenancyMiddleware, reservationsRoutes.createReservation);
app.put("/rendizy-server/reservations/:id", tenancyMiddleware, reservationsRoutes.updateReservation);
app.delete("/rendizy-server/reservations/:id", tenancyMiddleware, reservationsRoutes.deleteReservation);

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
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/debug", staysnetRoutes.debugRawStaysNet); // 🧪 DEBUG
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/SIMPLE", importStaysNetSimple); // ⚡ SIMPLES - INSERT direto
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/RPC", importStaysNetRPC); // ✅ USA RPC (igual FormularioAnuncio) - LEGACY
// ============================================================================
// ⚡ STAYSNET IMPORT MODULAR (v1.0.104) - Separado por entidade
// ============================================================================
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/properties", importStaysNetProperties); // 🏠 Properties → anuncios_ultimate
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/reservations", importStaysNetReservations); // 🏨 Reservations → reservations
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/guests", importStaysNetGuests); // 👤 Guests → guests
app.post("/rendizy-server/make-server-67caf26a/staysnet/import/blocks", importStaysNetBlocks); // ⛔ Blocks → blocks
// ============================================================================

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
Deno.serve((req) => {
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
    return app.fetch(req);
  } catch (error) {
    console.error("🔥 ERRO CRÍTICO NO APP:", error);
    // Garantir que CORS funciona mesmo em crash total
    return new Response(
      JSON.stringify({ 
        error: "Internal Server Error", 
        message: error.message,
        hint: "Check server logs for details"
      }), 
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        }
      }
    );
  }
});
