import { callClientSitesApi } from "../../_lib/rendizyPublic.js";

/**
 * GET /api/guest/reservations/status?siteSlug=xxx&reservationId=yyy
 * 
 * Endpoint PÚBLICO (sem autenticação) para verificar o status de uma reserva.
 * Usado pela página de checkout/success para fazer polling até o webhook confirmar.
 * 
 * Retorna apenas campos públicos (status, payment_status) para não expor dados sensíveis.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, error: "Method not allowed" }));
    return;
  }

  const u = new URL(req.url, "http://localhost");
  const siteSlug = u.searchParams.get("siteSlug") || "";
  const reservationId = u.searchParams.get("reservationId") || "";

  if (!siteSlug) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, error: "Missing siteSlug" }));
    return;
  }

  if (!reservationId) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, error: "Missing reservationId" }));
    return;
  }

  try {
    // Chama o backend público para obter status da reserva
    // Este endpoint precisa existir no rendizy-public
    const { res: upstream, json } = await callClientSitesApi(
      siteSlug,
      `/reservations/${reservationId}/status`,
      { method: "GET" }
    );

    if (!upstream.ok) {
      // Fallback: tentar endpoint mine sem auth e filtrar por ID
      // (se o backend tiver suporte a consulta pública por ID)
      
      res.statusCode = upstream.status || 502;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          error: json?.error || `Upstream error (${upstream.status})`,
        })
      );
      return;
    }

    // Retorna apenas campos públicos seguros
    const data = json?.data || json;
    const safeData = {
      id: data?.id || reservationId,
      status: data?.status || data?.reservation_status || "pending",
      paymentStatus: data?.paymentStatus || data?.payment_status || "pending",
      reservationCode: data?.reservationCode || data?.reservation_code || null,
    };

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.end(JSON.stringify({ success: true, data: safeData }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, error: String(err?.message || err) }));
  }
}
