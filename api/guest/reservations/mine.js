import { parseCookies, clearCookie, getDefaultCookieOptions } from "../../_lib/cookies.js";
import { callClientSitesApi } from "../../_lib/rendizyPublic.js";

const TOKEN_COOKIE = "rendizy_guest_token";
const SITE_COOKIE = "rendizy_site_slug";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, error: "Method not allowed" }));
    return;
  }

  const u = new URL(req.url, "http://localhost");
  const cookies = parseCookies(req);

  const siteSlug = u.searchParams.get("siteSlug") || cookies[SITE_COOKIE] || "";
  if (!siteSlug) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, authenticated: false, error: "Missing siteSlug" }));
    return;
  }

  const token = cookies[TOKEN_COOKIE];
  if (!token) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, authenticated: false }));
    return;
  }

  try {
    const { res: upstream, json } = await callClientSitesApi(siteSlug, "/reservations/mine", {
      method: "GET",
      token,
    });

    if (!upstream.ok) {
      if (upstream.status === 401 || upstream.status === 403) {
        clearCookie(res, TOKEN_COOKIE, getDefaultCookieOptions(req));
        clearCookie(res, SITE_COOKIE, getDefaultCookieOptions(req));
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, authenticated: false }));
        return;
      }

      res.statusCode = upstream.status || 502;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          error: json?.error || `Upstream error (${upstream.status})`,
          upstream: json,
        })
      );
      return;
    }

    const data = json?.data || json?.reservations || [];

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: true, authenticated: true, data }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, error: String(err?.message || err) }));
  }
}
