/**
 * 🏠 ROUTES GUEST AREA - v1.0.0
 * 
 * Endpoints públicos para a Cápsula Guest Area.
 * Permite que hóspedes vejam suas reservas e façam check-in/check-out.
 * 
 * Endpoints:
 * - GET  /guest/reservations?org_id=X&email=Y  → Lista reservas do hóspede
 * - POST /guest/checkin                        → Registra check-in online
 * - POST /guest/checkout                       → Registra check-out online
 */

import { Hono } from "https://deno.land/x/hono@v4.3.11/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

// ============================================
// SUPABASE CLIENT
// ============================================

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://odcgnzfremrqnvtitpcc.supabase.co";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================
// HELPERS
// ============================================

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, apikey, Authorization",
    },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: true, message }, status);
}

// ============================================
// APP HONO
// ============================================

export const guestAreaApp = new Hono();

// CORS preflight
guestAreaApp.options("*", (c) => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, apikey, Authorization",
    },
  });
});

/**
 * GET /guest/reservations
 * Busca reservas de um hóspede por email
 * 
 * Query params:
 * - org_id: ID da organização (ex: medhome)
 * - email: Email do hóspede
 */
guestAreaApp.get("/reservations", async (c) => {
  try {
    const orgId = c.req.query("org_id");
    const email = c.req.query("email");

    if (!orgId || !email) {
      return errorResponse("Parâmetros org_id e email são obrigatórios", 400);
    }

    console.log(`🏠 [GuestArea] Buscando reservas para ${email} em ${orgId}`);

    // 1. Buscar o guest pelo email
    const { data: guests, error: guestError } = await supabase
      .from("guests")
      .select("id, name, email, phone")
      .eq("org_id", orgId)
      .ilike("email", email)
      .limit(1);

    if (guestError) {
      console.error("❌ [GuestArea] Erro ao buscar guest:", guestError);
      return errorResponse("Erro ao buscar hóspede", 500);
    }

    if (!guests || guests.length === 0) {
      console.log(`ℹ️ [GuestArea] Nenhum hóspede encontrado com email ${email}`);
      return jsonResponse({ reservations: [], guest: null });
    }

    const guest = guests[0];
    console.log(`✅ [GuestArea] Guest encontrado: ${guest.id} - ${guest.name}`);

    // 2. Buscar reservas do guest
    const { data: reservations, error: resError } = await supabase
      .from("reservations")
      .select(`
        id,
        property_id,
        check_in,
        check_out,
        guests,
        status,
        total_price,
        checkin_done,
        checkout_done,
        created_at,
        data
      `)
      .eq("org_id", orgId)
      .eq("guest_id", guest.id)
      .order("check_in", { ascending: false });

    if (resError) {
      console.error("❌ [GuestArea] Erro ao buscar reservas:", resError);
      return errorResponse("Erro ao buscar reservas", 500);
    }

    // 3. Buscar dados das propriedades
    const propertyIds = [...new Set((reservations || []).map(r => r.property_id))];
    
    let propertiesMap: Record<string, { name: string; address: string; image: string }> = {};
    
    if (propertyIds.length > 0) {
      const { data: properties } = await supabase
        .from("properties")
        .select("id, data")
        .in("id", propertyIds);

      if (properties) {
        for (const prop of properties) {
          const data = prop.data || {};
          propertiesMap[prop.id] = {
            name: data.name || data.internalName || "Imóvel",
            address: data.address?.street 
              ? `${data.address.street}, ${data.address.number || ''} - ${data.address.city || ''}/${data.address.state || ''}`
              : data.address || "Endereço não informado",
            image: data.coverPhoto || data.photos?.[0]?.url || "",
          };
        }
      }
    }

    // 4. Formatar resposta
    const formattedReservations = (reservations || []).map(r => {
      const propInfo = propertiesMap[r.property_id] || {};
      return {
        id: r.id,
        property_id: r.property_id,
        property_name: propInfo.name || "Imóvel",
        property_image: propInfo.image || "",
        property_address: propInfo.address || "",
        check_in: r.check_in,
        check_out: r.check_out,
        guests: r.guests || 1,
        status: r.status || "confirmed",
        total_price: r.total_price || 0,
        checkin_done: r.checkin_done || false,
        checkout_done: r.checkout_done || false,
        created_at: r.created_at,
      };
    });

    console.log(`✅ [GuestArea] ${formattedReservations.length} reservas encontradas`);

    return jsonResponse({
      guest: {
        id: guest.id,
        name: guest.name,
        email: guest.email,
      },
      reservations: formattedReservations,
    });

  } catch (err) {
    console.error("❌ [GuestArea] Erro inesperado:", err);
    return errorResponse("Erro interno do servidor", 500);
  }
});

/**
 * POST /guest/checkin
 * Registra check-in online do hóspede
 * 
 * Body:
 * - reservation_id: ID da reserva
 * - org_id: ID da organização
 */
guestAreaApp.post("/checkin", async (c) => {
  try {
    const body = await c.req.json();
    const { reservation_id, org_id } = body;

    if (!reservation_id || !org_id) {
      return errorResponse("Parâmetros reservation_id e org_id são obrigatórios", 400);
    }

    console.log(`🏠 [GuestArea] Check-in para reserva ${reservation_id}`);

    // Atualizar reserva
    const { data, error } = await supabase
      .from("reservations")
      .update({ 
        checkin_done: true,
        checkin_at: new Date().toISOString(),
      })
      .eq("id", reservation_id)
      .eq("org_id", org_id)
      .select()
      .single();

    if (error) {
      console.error("❌ [GuestArea] Erro ao registrar check-in:", error);
      return errorResponse("Erro ao registrar check-in", 500);
    }

    console.log(`✅ [GuestArea] Check-in registrado para reserva ${reservation_id}`);

    return jsonResponse({
      success: true,
      message: "Check-in realizado com sucesso",
      reservation: data,
    });

  } catch (err) {
    console.error("❌ [GuestArea] Erro inesperado no check-in:", err);
    return errorResponse("Erro interno do servidor", 500);
  }
});

/**
 * POST /guest/checkout
 * Registra check-out online do hóspede
 * 
 * Body:
 * - reservation_id: ID da reserva
 * - org_id: ID da organização
 */
guestAreaApp.post("/checkout", async (c) => {
  try {
    const body = await c.req.json();
    const { reservation_id, org_id } = body;

    if (!reservation_id || !org_id) {
      return errorResponse("Parâmetros reservation_id e org_id são obrigatórios", 400);
    }

    console.log(`🏠 [GuestArea] Check-out para reserva ${reservation_id}`);

    // Atualizar reserva
    const { data, error } = await supabase
      .from("reservations")
      .update({ 
        checkout_done: true,
        checkout_at: new Date().toISOString(),
        status: "completed",
      })
      .eq("id", reservation_id)
      .eq("org_id", org_id)
      .select()
      .single();

    if (error) {
      console.error("❌ [GuestArea] Erro ao registrar check-out:", error);
      return errorResponse("Erro ao registrar check-out", 500);
    }

    console.log(`✅ [GuestArea] Check-out registrado para reserva ${reservation_id}`);

    return jsonResponse({
      success: true,
      message: "Check-out realizado com sucesso",
      reservation: data,
    });

  } catch (err) {
    console.error("❌ [GuestArea] Erro inesperado no check-out:", err);
    return errorResponse("Erro interno do servidor", 500);
  }
});

export default guestAreaApp;
