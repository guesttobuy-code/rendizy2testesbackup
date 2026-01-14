import { clearCookie, getDefaultCookieOptions } from "../_lib/cookies.js";

const TOKEN_COOKIE = "rendizy_guest_token";
const SITE_COOKIE = "rendizy_site_slug";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.statusCode = 405;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: false, error: "Method not allowed" }));
    return;
  }

  clearCookie(res, TOKEN_COOKIE, getDefaultCookieOptions(req));
  clearCookie(res, SITE_COOKIE, getDefaultCookieOptions(req));

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ success: true }));
}
