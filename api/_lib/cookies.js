function appendSetCookie(res, value) {
  const existing = res.getHeader("Set-Cookie");
  if (!existing) {
    res.setHeader("Set-Cookie", value);
    return;
  }
  if (Array.isArray(existing)) {
    res.setHeader("Set-Cookie", [...existing, value]);
    return;
  }
  res.setHeader("Set-Cookie", [existing, value]);
}

export function parseCookies(req) {
  const header = req.headers?.cookie || "";
  const out = {};
  header
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
    .forEach((part) => {
      const idx = part.indexOf("=");
      if (idx <= 0) return;
      const key = part.slice(0, idx).trim();
      const value = part.slice(idx + 1);
      try {
        out[key] = decodeURIComponent(value);
      } catch {
        out[key] = value;
      }
    });
  return out;
}

export function buildCookie(name, value, options = {}) {
  const {
    httpOnly = true,
    secure = true,
    sameSite = "Lax",
    path = "/",
    domain,
    maxAge,
    expires,
  } = options;

  const parts = [`${name}=${encodeURIComponent(String(value ?? ""))}`];

  if (maxAge != null) parts.push(`Max-Age=${Math.floor(maxAge)}`);
  if (expires) parts.push(`Expires=${expires.toUTCString()}`);
  if (domain) parts.push(`Domain=${domain}`);
  if (path) parts.push(`Path=${path}`);
  if (sameSite) parts.push(`SameSite=${sameSite}`);
  if (secure) parts.push("Secure");
  if (httpOnly) parts.push("HttpOnly");

  return parts.join("; ");
}

export function setCookie(res, name, value, options = {}) {
  appendSetCookie(res, buildCookie(name, value, options));
}

export function clearCookie(res, name, options = {}) {
  setCookie(res, name, "", {
    ...options,
    maxAge: 0,
    expires: new Date(0),
  });
}

export function getDefaultCookieOptions(req) {
  const isProd =
    process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";

  // Prefer explicit domain config (needed for custom domains).
  // Example: .medhome.com.br
  const domain = process.env.AUTH_COOKIE_DOMAIN || undefined;

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "Lax",
    path: "/",
    domain,
  };
}
