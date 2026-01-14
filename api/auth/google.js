import { setCookie, getDefaultCookieOptions } from "../_lib/cookies.js";
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

  const credential = payload?.credential;
  const siteSlug = payload?.siteSlug;

  if (!credential || !siteSlug) {
    res.statusCode = 400;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, error: "Missing credential or siteSlug" }));
    return;
  }

  try {
    const { res: upstream, json } = await callClientSitesApi(siteSlug, "/auth/guest/google", {
      method: "POST",
      body: { credential },
    });

    if (!upstream.ok || !json?.success || !json?.token) {
      res.statusCode = 401;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          error: json?.error || `Login failed (${upstream.status})`,
        })
      );
      return;
    }

    const cookieOpts = {
      ...getDefaultCookieOptions(req),
      maxAge: 60 * 60 * 24 * 30, // 30 days
    };

    setCookie(res, TOKEN_COOKIE, json.token, cookieOpts);
    setCookie(res, SITE_COOKIE, siteSlug, cookieOpts);

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: true, guest: json.guest }));
  } catch (err) {
    console.error("/api/auth/google error", err);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, error: "Internal error" }));
  }
}
