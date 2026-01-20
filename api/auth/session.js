import { clearCookie, setCookie, getDefaultCookieOptions } from "../_lib/cookies.js";
import { callClientSitesApi } from "../_lib/rendizyPublic.js";

const TOKEN_COOKIE = "rendizy_guest_token";
const SITE_COOKIE = "rendizy_site_slug";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, error: "Method not allowed" }));
    return;
  }

  let payload;
  try {
    payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  } catch {
    payload = null;
  }

  const token = payload?.token;
  const siteSlug = payload?.siteSlug;

  if (!token || !siteSlug) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, error: "Missing token or siteSlug" }));
    return;
  }

  try {
    const { res: upstream, json } = await callClientSitesApi(siteSlug, "/auth/guest/me", {
      method: "GET",
      token,
    });

    if (!upstream.ok || !json?.success || !json?.user) {
      clearCookie(res, TOKEN_COOKIE, getDefaultCookieOptions(req));
      clearCookie(res, SITE_COOKIE, getDefaultCookieOptions(req));
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          error: json?.error || `Invalid token (${upstream.status})`,
        })
      );
      return;
    }

    const cookieOpts = {
      ...getDefaultCookieOptions(req),
      maxAge: 60 * 60 * 24 * 30, // 30 days
    };

    setCookie(res, TOKEN_COOKIE, token, cookieOpts);
    setCookie(res, SITE_COOKIE, siteSlug, { ...cookieOpts, httpOnly: true });

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: true, user: json.user }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, error: String(err?.message || err) }));
  }
}
