// routes-calendar-rules-batch.ts
// ============================================================================
// ROTA: Batch de Regras do Calendário
// ============================================================================
// MIGRADO DE: supabase/functions/calendar-rules-batch/index.ts
// DATA: 2026-01-18
// ADR: docs/ADR_EDGE_FUNCTIONS_ARQUITETURA_CENTRALIZADA.md
//
// PROPÓSITO:
// Processar múltiplas operações (upsert/delete) de regras de calendário
// em uma única requisição HTTP, reduzindo latência e overhead de conexão.
//
// LIMITES:
// - MAX_BATCH_SIZE: 500 operações por request
// - UPSERT_BATCH_SIZE: 100 operações por query (interno)
//
// ROTAS:
// - GET  /calendar-rules/batch - Listar regras com filtros
// - POST /calendar-rules/batch - Processar operações em lote
//
// CHAMADO POR: hooks/useCalendarPricingRules.ts (flushQueue)
// ============================================================================

import { type Context } from "npm:hono";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "./utils-env.ts";

// ============================================================================
// TYPES
// ============================================================================

interface BatchOperation {
  type: "upsert" | "delete";
  id?: string;
  property_id: string;
  organization_id?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  base_price?: number;
  min_nights?: number;
  condition_percent?: number;
  restriction?: string;
  notes?: string;
}

interface BatchRequest {
  operations: BatchOperation[];
  organization_id?: string;
}

interface BatchResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ index: number; error: string }>;
  results: Array<{
    index: number;
    id: string;
    action: "inserted" | "updated" | "deleted";
  }>;
}

interface SessionData {
  user_id: string;
  organization_id: string;
}

// ============================================================================
// SESSION VALIDATION
// ============================================================================

async function validateCustomToken(
  token: string,
  supabase: ReturnType<typeof createClient>
): Promise<SessionData | null> {
  if (!token || token.length < 30) {
    return null;
  }

  try {
    const { data: session, error } = await supabase
      .from("sessions")
      .select("user_id, organization_id")
      .or(`token.eq.${token},access_token.eq.${token}`)
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !session) {
      console.log(
        "[calendar-rules-batch] Session not found for token:",
        token.substring(0, 20) + "..."
      );
      return null;
    }

    return {
      user_id: session.user_id,
      organization_id: session.organization_id,
    };
  } catch (err) {
    console.error("[calendar-rules-batch] Error validating token:", err);
    return null;
  }
}

// ============================================================================
// HANDLER: GET /calendar-rules/batch
// ============================================================================

export async function calendarRulesBatchGet(c: Context): Promise<Response> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Authenticate
  let token = c.req.header("x-auth-token");
  if (!token) {
    const authHeader = c.req.header("authorization");
    if (authHeader) {
      token = authHeader.replace("Bearer ", "");
    }
  }

  if (!token) {
    return c.json({ error: "Missing authentication token" }, 401);
  }

  const sessionData = await validateCustomToken(token, supabase);
  if (!sessionData) {
    return c.json({ error: "Invalid or expired session token" }, 401);
  }

  const organizationId = sessionData.organization_id;
  const from = c.req.query("from");
  const to = c.req.query("to");
  const propertyId = c.req.query("property_id");
  const idsParam = c.req.query("ids");

  let query = supabase
    .from("calendar_pricing_rules")
    .select("*")
    .eq("organization_id", organizationId)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  if (propertyId) {
    query = query.eq("property_id", propertyId);
  }

  if (idsParam) {
    const ids = idsParam
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
    if (ids.length > 0) {
      query = query.in("id", ids);
    }
  }

  if (from && to) {
    query = query.lte("start_date", to).gte("end_date", from);
  }

  const { data, error } = await query;

  if (error) {
    return c.json({ success: false, error: error.message }, 400);
  }

  return c.json({ success: true, data: data || [] });
}

// ============================================================================
// HANDLER: POST /calendar-rules/batch
// ============================================================================

export async function calendarRulesBatchPost(c: Context): Promise<Response> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Authenticate
  let token = c.req.header("x-auth-token");
  if (!token) {
    const authHeader = c.req.header("authorization");
    if (authHeader) {
      token = authHeader.replace("Bearer ", "");
    }
  }

  if (!token) {
    return c.json({ error: "Missing authentication token" }, 401);
  }

  const sessionData = await validateCustomToken(token, supabase);
  if (!sessionData) {
    return c.json({ error: "Invalid or expired session token" }, 401);
  }

  const organizationId = sessionData.organization_id;
  console.log(
    "[calendar-rules-batch] Authenticated user:",
    sessionData.user_id,
    "org:",
    organizationId
  );

  // Parse request body
  const body: BatchRequest = await c.req.json();

  if (!body.operations || !Array.isArray(body.operations)) {
    return c.json({ error: "Invalid request: operations array required" }, 400);
  }

  // Limit batch size
  const MAX_BATCH_SIZE = 500;
  if (body.operations.length > MAX_BATCH_SIZE) {
    return c.json({ error: `Batch size exceeds limit of ${MAX_BATCH_SIZE}` }, 400);
  }

  // Process operations
  const result: BatchResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
    results: [],
  };

  const upsertOps: Array<{ index: number; data: Record<string, unknown> }> = [];
  const deleteOps: Array<{ index: number; id: string }> = [];

  for (let i = 0; i < body.operations.length; i++) {
    const op = body.operations[i];

    if (!op.property_id) {
      result.errors.push({ index: i, error: "Missing property_id" });
      result.failed++;
      continue;
    }

    const startDate = op.start_date || op.date;
    const endDate = op.end_date || op.date;

    if (!startDate || !endDate) {
      result.errors.push({
        index: i,
        error: "Missing date (use date or start_date+end_date)",
      });
      result.failed++;
      continue;
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
    ) {
      result.errors.push({
        index: i,
        error: "Invalid date format, expected YYYY-MM-DD",
      });
      result.failed++;
      continue;
    }

    if (op.type === "delete") {
      if (!op.id) {
        result.errors.push({ index: i, error: "Delete requires id" });
        result.failed++;
        continue;
      }
      deleteOps.push({ index: i, id: op.id });
    } else {
      upsertOps.push({
        index: i,
        data: {
          property_id: op.property_id,
          organization_id: organizationId,
          start_date: startDate,
          end_date: endDate,
          base_price: op.base_price,
          min_nights: op.min_nights,
          condition_percent: op.condition_percent,
          restriction: op.restriction,
          updated_at: new Date().toISOString(),
        },
      });
    }
  }

  // Process deletes
  if (deleteOps.length > 0) {
    const idsToDelete = deleteOps.map((d) => d.id);
    const { error: deleteError } = await supabase
      .from("calendar_pricing_rules")
      .delete()
      .in("id", idsToDelete)
      .eq("organization_id", organizationId);

    if (deleteError) {
      for (const d of deleteOps) {
        result.errors.push({ index: d.index, error: deleteError.message });
        result.failed++;
      }
    } else {
      for (const d of deleteOps) {
        result.results.push({ index: d.index, id: d.id, action: "deleted" });
        result.processed++;
      }
    }
  }

  // Process upserts (merge parcial por coluna)
  const UPSERT_BATCH_SIZE = 100;
  for (let i = 0; i < upsertOps.length; i += UPSERT_BATCH_SIZE) {
    const batch = upsertOps.slice(i, i + UPSERT_BATCH_SIZE);

    for (const b of batch) {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (typeof b.data.base_price !== "undefined")
        updateData.base_price = b.data.base_price;
      if (typeof b.data.min_nights !== "undefined")
        updateData.min_nights = b.data.min_nights;
      if (typeof b.data.condition_percent !== "undefined")
        updateData.condition_percent = b.data.condition_percent;
      if (typeof b.data.restriction !== "undefined")
        updateData.restriction = b.data.restriction;

      const { data: updatedRows, error: updateError } = await supabase
        .from("calendar_pricing_rules")
        .update(updateData)
        .eq("organization_id", b.data.organization_id as string)
        .eq("property_id", b.data.property_id as string)
        .eq("start_date", b.data.start_date as string)
        .eq("end_date", b.data.end_date as string)
        .select("id")
        .limit(1);

      if (updateError) {
        result.errors.push({ index: b.index, error: updateError.message });
        result.failed++;
        continue;
      }

      if (updatedRows && updatedRows.length > 0) {
        result.results.push({
          index: b.index,
          id: updatedRows[0].id,
          action: "updated",
        });
        result.processed++;
        continue;
      }

      // Insert if not found
      const insertData: Record<string, unknown> = {
        property_id: b.data.property_id,
        organization_id: b.data.organization_id,
        start_date: b.data.start_date,
        end_date: b.data.end_date,
        updated_at: new Date().toISOString(),
      };

      if (typeof b.data.base_price !== "undefined")
        insertData.base_price = b.data.base_price;
      if (typeof b.data.min_nights !== "undefined")
        insertData.min_nights = b.data.min_nights;
      if (typeof b.data.condition_percent !== "undefined")
        insertData.condition_percent = b.data.condition_percent;
      if (typeof b.data.restriction !== "undefined")
        insertData.restriction = b.data.restriction;

      const { data: insertedData, error: insertError } = await supabase
        .from("calendar_pricing_rules")
        .insert(insertData)
        .select("id")
        .limit(1);

      if (insertError) {
        result.errors.push({ index: b.index, error: insertError.message });
        result.failed++;
        continue;
      }

      result.results.push({
        index: b.index,
        id: insertedData?.[0]?.id || "",
        action: "inserted",
      });
      result.processed++;
    }
  }

  result.success = result.failed === 0;

  return c.json(result);
}
