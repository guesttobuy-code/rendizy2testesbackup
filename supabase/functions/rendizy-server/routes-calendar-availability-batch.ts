// routes-calendar-availability-batch.ts
// ============================================================================
// ROTA: Batch de Availability (Rate Plans)
// ============================================================================
// ADR: docs/ADR_RATE_PLANS_CALENDAR_INTEGRATION.md
//
// PROPÓSITO:
// Processar múltiplas operações (upsert/delete) de availability e pricing
// overrides nas tabelas rate_plan_* em uma única requisição HTTP.
//
// DIFERENÇA DO calendar-rules-batch:
// - Este escreve em rate_plan_availability + rate_plan_pricing_overrides
// - O antigo (calendar-rules-batch) escreve em calendar_pricing_rules (depreciado)
//
// LIMITES:
// - MAX_BATCH_SIZE: 500 operações por request
// - UPSERT_BATCH_SIZE: 100 operações por query (interno)
//
// ROTAS:
// - GET  /calendar-availability/batch - Listar availability com filtros
// - POST /calendar-availability/batch - Processar operações em lote
//
// CHAMADO POR: hooks/useCalendarAvailability.ts (flushQueue)
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
  rate_plan_id?: string;
  organization_id?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  // Availability fields
  is_closed?: boolean;
  closed_to_arrival?: boolean;
  closed_to_departure?: boolean;
  stop_sell?: boolean;
  min_nights?: number;
  max_nights?: number;
  available_units?: number;
  // Pricing override fields
  condition_percent?: number;
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
    table: "availability" | "pricing_override";
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
        "[calendar-availability-batch] Session not found for token:",
        token.substring(0, 20) + "..."
      );
      return null;
    }

    return {
      user_id: session.user_id,
      organization_id: session.organization_id,
    };
  } catch (err) {
    console.error("[calendar-availability-batch] Error validating token:", err);
    return null;
  }
}

// ============================================================================
// HELPER: Expand date range
// ============================================================================

function expandDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
  }

  return dates;
}

// ============================================================================
// HANDLER: GET /calendar-availability/batch
// ============================================================================

export async function calendarAvailabilityBatchGet(c: Context): Promise<Response> {
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
  const ratePlanId = c.req.query("rate_plan_id");

  // Get rate_plan IDs for this org
  let ratePlanIds: string[] = [];

  if (ratePlanId) {
    ratePlanIds = [ratePlanId];
  } else {
    const { data: ratePlans, error: rpError } = await supabase
      .from("rate_plans")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("code", "STANDARD")
      .eq("is_active", true);

    if (rpError) {
      return c.json({ success: false, error: rpError.message }, 400);
    }

    ratePlanIds = (ratePlans || []).map((rp) => rp.id);
  }

  if (ratePlanIds.length === 0) {
    return c.json({ success: true, data: { availability: [], overrides: [] } });
  }

  // Fetch availability
  let availQuery = supabase
    .from("rate_plan_availability")
    .select("*")
    .in("rate_plan_id", ratePlanIds)
    .order("date", { ascending: true });

  if (propertyId) {
    availQuery = availQuery.eq("property_id", propertyId);
  }

  if (from && to) {
    availQuery = availQuery.gte("date", from).lte("date", to);
  }

  const { data: availability, error: availError } = await availQuery;

  if (availError) {
    return c.json({ success: false, error: availError.message }, 400);
  }

  // Fetch pricing overrides
  let overridesQuery = supabase
    .from("rate_plan_pricing_overrides")
    .select("*")
    .in("rate_plan_id", ratePlanIds)
    .eq("is_active", true);

  if (from && to) {
    overridesQuery = overridesQuery.lte("date_from", to).gte("date_to", from);
  }

  const { data: overrides, error: overridesError } = await overridesQuery;

  if (overridesError) {
    return c.json({ success: false, error: overridesError.message }, 400);
  }

  return c.json({
    success: true,
    data: {
      availability: availability || [],
      overrides: overrides || [],
    },
  });
}

// ============================================================================
// HANDLER: POST /calendar-availability/batch
// ============================================================================

export async function calendarAvailabilityBatchPost(c: Context): Promise<Response> {
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
    "[calendar-availability-batch] Authenticated user:",
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

  // Get default rate_plan for each property
  const propertyIds = [...new Set(body.operations.map((op) => op.property_id).filter(Boolean))];

  const { data: ratePlans, error: rpError } = await supabase
    .from("rate_plans")
    .select("id, property_id")
    .eq("organization_id", organizationId)
    .eq("code", "STANDARD")
    .eq("is_active", true)
    .in("property_id", propertyIds);

  if (rpError) {
    return c.json({ error: `Failed to fetch rate plans: ${rpError.message}` }, 400);
  }

  const ratePlanByProperty = new Map<string, string>();
  for (const rp of ratePlans || []) {
    ratePlanByProperty.set(rp.property_id, rp.id);
  }

  // Process operations
  const result: BatchResult = {
    success: true,
    processed: 0,
    failed: 0,
    errors: [],
    results: [],
  };

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

    // Get or use provided rate_plan_id
    const ratePlanId = op.rate_plan_id || ratePlanByProperty.get(op.property_id);
    if (!ratePlanId) {
      result.errors.push({
        index: i,
        error: `No STANDARD rate plan found for property ${op.property_id}`,
      });
      result.failed++;
      continue;
    }

    // ========================================================================
    // PROCESS AVAILABILITY (is_closed, CTA, CTD, min_nights, etc)
    // ========================================================================

    const hasAvailabilityFields =
      op.is_closed !== undefined ||
      op.closed_to_arrival !== undefined ||
      op.closed_to_departure !== undefined ||
      op.stop_sell !== undefined ||
      op.min_nights !== undefined ||
      op.max_nights !== undefined ||
      op.available_units !== undefined;

    if (hasAvailabilityFields) {
      const dates = expandDateRange(startDate, endDate);

      for (const date of dates) {
        const availData: Record<string, unknown> = {
          rate_plan_id: ratePlanId,
          property_id: op.property_id,
          date,
          updated_at: new Date().toISOString(),
        };

        if (op.is_closed !== undefined) availData.is_closed = op.is_closed;
        if (op.closed_to_arrival !== undefined) availData.closed_to_arrival = op.closed_to_arrival;
        if (op.closed_to_departure !== undefined) availData.closed_to_departure = op.closed_to_departure;
        if (op.stop_sell !== undefined) availData.stop_sell = op.stop_sell;
        if (op.min_nights !== undefined) availData.min_nights = op.min_nights;
        if (op.max_nights !== undefined) availData.max_nights = op.max_nights;
        if (op.available_units !== undefined) availData.available_units = op.available_units;

        // Try update first
        const { data: updatedRows, error: updateError } = await supabase
          .from("rate_plan_availability")
          .update(availData)
          .eq("rate_plan_id", ratePlanId)
          .eq("property_id", op.property_id)
          .eq("date", date)
          .select("id")
          .limit(1);

        if (updateError) {
          result.errors.push({ index: i, error: `Avail update: ${updateError.message}` });
          result.failed++;
          continue;
        }

        if (updatedRows && updatedRows.length > 0) {
          result.results.push({
            index: i,
            id: updatedRows[0].id,
            action: "updated",
            table: "availability",
          });
          result.processed++;
          continue;
        }

        // Insert if not found
        const { data: insertedData, error: insertError } = await supabase
          .from("rate_plan_availability")
          .insert({
            ...availData,
            is_closed: op.is_closed ?? false,
            closed_to_arrival: op.closed_to_arrival ?? false,
            closed_to_departure: op.closed_to_departure ?? false,
            stop_sell: op.stop_sell ?? false,
            min_nights: op.min_nights ?? null,
            max_nights: op.max_nights ?? null,
          })
          .select("id")
          .limit(1);

        if (insertError) {
          result.errors.push({ index: i, error: `Avail insert: ${insertError.message}` });
          result.failed++;
          continue;
        }

        result.results.push({
          index: i,
          id: insertedData?.[0]?.id || "",
          action: "inserted",
          table: "availability",
        });
        result.processed++;
      }
    }

    // ========================================================================
    // PROCESS PRICING OVERRIDE (condition_percent)
    // ========================================================================

    if (op.condition_percent !== undefined && op.condition_percent !== 0) {
      const overrideData: Record<string, unknown> = {
        rate_plan_id: ratePlanId,
        date_from: startDate,
        date_to: endDate,
        override_type: "adjustment",
        price_adjustment_type: "percentage",
        price_adjustment_value: op.condition_percent,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      // Try update first
      const { data: updatedRows, error: updateError } = await supabase
        .from("rate_plan_pricing_overrides")
        .update(overrideData)
        .eq("rate_plan_id", ratePlanId)
        .eq("date_from", startDate)
        .eq("date_to", endDate)
        .select("id")
        .limit(1);

      if (updateError) {
        result.errors.push({ index: i, error: `Override update: ${updateError.message}` });
        result.failed++;
        continue;
      }

      if (updatedRows && updatedRows.length > 0) {
        result.results.push({
          index: i,
          id: updatedRows[0].id,
          action: "updated",
          table: "pricing_override",
        });
        result.processed++;
        continue;
      }

      // Insert if not found
      const { data: insertedData, error: insertError } = await supabase
        .from("rate_plan_pricing_overrides")
        .insert({
          ...overrideData,
          reason: "Created via calendar UI",
        })
        .select("id")
        .limit(1);

      if (insertError) {
        result.errors.push({ index: i, error: `Override insert: ${insertError.message}` });
        result.failed++;
        continue;
      }

      result.results.push({
        index: i,
        id: insertedData?.[0]?.id || "",
        action: "inserted",
        table: "pricing_override",
      });
      result.processed++;
    }
  }

  result.success = result.failed === 0;

  console.log(
    `[calendar-availability-batch] Completed: ${result.processed} processed, ${result.failed} failed`
  );

  return c.json(result);
}
