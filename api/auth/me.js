import { parseCookies, clearCookie, getDefaultCookieOptions } from "../_lib/cookies.js";
import { callClientSitesApi } from "../_lib/rendizyPublic.js";

const TOKEN_COOKIE = "rendizy_guest_token";
const SITE_COOKIE = "rendizy_site_slug";

export default async function handler(req, res) {
  const u = new URL(req.url, "http://localhost");
  const cookies = parseCookies(req);
  const siteSlug = u.searchParams.get("siteSlug") || cookies[SITE_COOKIE] || "";

  if (!siteSlug) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ authenticated: false, error: "Missing siteSlug" }));
    return;
  }

  const token = cookies[TOKEN_COOKIE];

  if (!token) {
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ authenticated: false }));
    return;
  }

  try {
    const { res: upstream, json } = await callClientSitesApi(siteSlug, "/auth/guest/me", {
      method: "GET",
      token,
    });

    if (!upstream.ok || !json?.success || !json?.user) {
      // Invalid/expired token: clear cookie
      clearCookie(res, TOKEN_COOKIE, getDefaultCookieOptions(req));
      clearCookie(res, SITE_COOKIE, getDefaultCookieOptions(req));
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ authenticated: false }));
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ authenticated: true, user: json.user }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ authenticated: false, error: String(err?.message || err) }));
  }
}
