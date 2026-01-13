// ============================================================================
// CRON JOB: Cancelar Reservas Pendentes Expiradas
// Similar to Stays.net "Pré-reservas" timeout feature
// ============================================================================
// Este endpoint deve ser chamado por um cron job externo (ex: Supabase cron, 
// GitHub Actions, ou serviço como cron-job.org) a cada 5-15 minutos
//
// Endpoint: POST /rendizy-server/cron/cancel-expired-pending-reservations
// Auth: Requer x-cron-secret header para segurança
// ============================================================================

import type { Context } from "npm:hono";
import { getSupabaseClient } from "./kv_store.tsx";
import { logInfo, logError } from "./utils.ts";

const CRON_SECRET = Deno.env.get("CRON_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface ExpiredReservation {
  id: string;
  organization_id: string;
  check_in: string;
  check_out: string;
  payment_expires_at: string;
  status: string;
  payment_status: string;
}

interface OrganizationSettings {
  id: string;
  pending_reservation_auto_cancel: boolean;
  pending_reservation_notify_admin: boolean;
}

export async function cancelExpiredPendingReservations(c: Context) {
  try {
    // Validate cron secret (basic protection)
    const cronSecret = c.req.header("x-cron-secret") || c.req.header("X-Cron-Secret");
    const apiKey = c.req.header("apikey") || c.req.header("Authorization")?.replace("Bearer ", "");
    
    // Allow service_role key OR cron secret
    if (CRON_SECRET && cronSecret !== CRON_SECRET && apiKey !== CRON_SECRET) {
      logError("[Cron] Invalid or missing cron secret");
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    logInfo(`[Cron] Starting expired pending reservations check at ${now}`);

    // 1. Find all expired pending reservations
    const { data: expiredReservations, error: findError } = await supabase
      .from("reservations")
      .select("id, organization_id, check_in, check_out, payment_expires_at, status, payment_status")
      .eq("status", "pending")
      .eq("payment_status", "pending")
      .not("payment_expires_at", "is", null)
      .lt("payment_expires_at", now)
      .limit(100); // Process in batches to avoid timeout

    if (findError) {
      logError("[Cron] Error finding expired reservations:", findError);
      return c.json({ success: false, error: findError.message }, 500);
    }

    if (!expiredReservations || expiredReservations.length === 0) {
      logInfo("[Cron] No expired pending reservations found");
      return c.json({ 
        success: true, 
        data: { 
          processed: 0, 
          cancelled: 0, 
          skipped: 0,
          message: "Nenhuma reserva pendente expirada encontrada" 
        } 
      });
    }

    logInfo(`[Cron] Found ${expiredReservations.length} expired pending reservations`);

    // 2. Get organization settings to check if auto-cancel is enabled
    const orgIds = [...new Set((expiredReservations as ExpiredReservation[]).map(r => r.organization_id))];
    const { data: orgsSettings } = await supabase
      .from("organizations")
      .select("id, pending_reservation_auto_cancel, pending_reservation_notify_admin")
      .in("id", orgIds);

    const orgSettingsMap = new Map<string, OrganizationSettings>();
    if (orgsSettings) {
      for (const org of orgsSettings as OrganizationSettings[]) {
        orgSettingsMap.set(org.id, org);
      }
    }

    // 3. Process each expired reservation
    let cancelled = 0;
    let skipped = 0;
    const results: Array<{ id: string; action: string; reason?: string }> = [];

    for (const reservation of expiredReservations as ExpiredReservation[]) {
      const orgSettings = orgSettingsMap.get(reservation.organization_id);
      
      // Check if auto-cancel is enabled for this organization (default: true)
      const autoCancelEnabled = orgSettings?.pending_reservation_auto_cancel ?? true;
      
      if (!autoCancelEnabled) {
        skipped++;
        results.push({ 
          id: reservation.id, 
          action: "skipped", 
          reason: "Auto-cancel disabled for organization" 
        });
        continue;
      }

      // Cancel the reservation
      const { error: cancelError } = await supabase
        .from("reservations")
        .update({
          status: "cancelled",
          cancellation_reason: "payment_timeout",
          updated_at: now,
          internal_comments: `[Sistema] Reserva cancelada automaticamente por timeout de pagamento. Expirou em: ${reservation.payment_expires_at}`
        })
        .eq("id", reservation.id);

      if (cancelError) {
        logError(`[Cron] Error cancelling reservation ${reservation.id}:`, cancelError);
        results.push({ 
          id: reservation.id, 
          action: "error", 
          reason: cancelError.message 
        });
        continue;
      }

      cancelled++;
      results.push({ id: reservation.id, action: "cancelled" });
      logInfo(`[Cron] Cancelled expired reservation ${reservation.id} (expired at ${reservation.payment_expires_at})`);

      // TODO: Future - Send notifications if enabled
      // if (orgSettings?.pending_reservation_notify_admin) {
      //   await sendAdminNotification(reservation);
      // }
    }

    const summary = {
      processed: expiredReservations.length,
      cancelled,
      skipped,
      timestamp: now,
      results
    };

    logInfo(`[Cron] Completed: ${cancelled} cancelled, ${skipped} skipped out of ${expiredReservations.length} expired`);

    return c.json({ success: true, data: summary });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logError("[Cron] Unexpected error:", error);
    return c.json({ success: false, error: errMsg }, 500);
  }
}

// ============================================================================
// GET: List pending reservations that will expire soon (for admin dashboard)
// ============================================================================
export async function listPendingReservationsNearExpiry(c: Context) {
  try {
    const supabase = getSupabaseClient();
    const now = new Date();
    
    // Get reservations expiring in the next 6 hours
    const sixHoursFromNow = new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("reservations")
      .select(`
        id, 
        check_in, 
        check_out, 
        payment_expires_at, 
        status, 
        payment_status,
        pricing_total,
        pricing_currency,
        organization_id,
        property_id,
        created_at
      `)
      .eq("status", "pending")
      .eq("payment_status", "pending")
      .not("payment_expires_at", "is", null)
      .gt("payment_expires_at", now.toISOString())
      .lt("payment_expires_at", sixHoursFromNow)
      .order("payment_expires_at", { ascending: true });

    if (error) {
      logError("[Cron] Error listing pending reservations near expiry:", error);
      return c.json({ success: false, error: error.message }, 500);
    }

    return c.json({
      success: true,
      data: {
        reservations: data || [],
        count: data?.length || 0,
        expiryWindowHours: 6
      }
    });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logError("[Cron] Error:", error);
    return c.json({ success: false, error: errMsg }, 500);
  }
}
