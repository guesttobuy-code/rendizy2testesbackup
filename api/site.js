// Vercel Serverless Function
// Generic client-site preview under this Vercel domain:
//   /site/<subdomain>
//   /site/<subdomain>/<assetPath>
//
// Why: Supabase Edge/Storage currently forces text/plain + sandbox CSP for HTML.
// We proxy the HTML through Vercel so the browser receives text/html and a usable CSP.

import { Buffer } from "node:buffer";

const SUPABASE_PROJECT_REF = "odcgnzfremrqnvtitpcc";

function contentTypeForPath(pathname) {
  const ext = String(pathname || "").split("?")[0].split(".").pop()?.toLowerCase() || "";
  const map = {
    js: "application/javascript; charset=utf-8",
    mjs: "application/javascript; charset=utf-8",
    css: "text/css; charset=utf-8",
    html: "text/html; charset=utf-8",
    htm: "text/html; charset=utf-8",
    json: "application/json; charset=utf-8",
    svg: "image/svg+xml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    ico: "image/x-icon",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    eot: "application/vnd.ms-fontobject",
    map: "application/json; charset=utf-8",
    txt: "text/plain; charset=utf-8",
  };
  return map[ext] || "application/octet-stream";
}

function buildCsp() {
  const supabaseOrigin = `https://${SUPABASE_PROJECT_REF}.supabase.co`;

  return [
    "default-src 'self'",
    `connect-src 'self' https: ${supabaseOrigin}`,
    `img-src 'self' data: https: ${supabaseOrigin}`,
    `script-src 'self' 'unsafe-inline' ${supabaseOrigin}`,
    `style-src 'self' 'unsafe-inline' https: ${supabaseOrigin}`,
    `font-src 'self' data: https: ${supabaseOrigin}`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

function patchHtmlForSubpath(html, baseHref) {
  let out = html;

  // Ensure we have a <base href="..."> so that relative assets resolve under our subpath.
  // baseHref MUST end with a trailing slash.
  const normalizedBaseHref = baseHref.endsWith("/") ? baseHref : `${baseHref}/`;

  if (/<base\s+href=/i.test(out)) {
    out = out.replace(/<base\s+href=["'][^"']*["']\s*\/?\s*>/gi, `<base href="${normalizedBaseHref}" />`);
  } else if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head[^>]*>/i, (m) => `${m}\n  <base href="${normalizedBaseHref}" />`);
  }

  // Convert absolute-root assets to relative so baseHref applies.
  out = out.replace(/\s(src|href)="\/assets\//gi, ' $1="assets/');
  out = out.replace(/\s(src|href)="\.\/assets\//gi, ' $1="assets/');

  // Common root-level static files.
  out = out.replace(/\s(href)="\/(favicon\.(ico|png|svg)|manifest\.webmanifest|robots\.txt)(\?[^"#]*)?"/gi, ' $1="$2$4"');

  return out;
}

function cleanRequestedPath(p) {
  const clean = String(p || "").replace(/^\/+/, "");
  if (!clean) return "";
  if (clean.includes("..")) return null;
  if (/^https?:\/\//i.test(clean)) return null;
  return clean;
}

function buildUpstreamAssetUrl(baseUrl, cleanPath, req) {
  const u = new URL(req.url, "http://localhost");
  const passthrough = new URLSearchParams(u.search);
  passthrough.delete("subdomain");
  passthrough.delete("path");
  const qs = passthrough.toString();
  return qs ? `${baseUrl}/${cleanPath}?${qs}` : `${baseUrl}/${cleanPath}`;
}

async function resolveStorageIndexUrl(serveUrl) {
  const r = await fetch(serveUrl, { redirect: "manual" });

  const loc = r.headers.get("location");
  if (loc && (r.status === 301 || r.status === 302 || r.status === 303 || r.status === 307 || r.status === 308)) {
    return new URL(loc, serveUrl).toString();
  }

  // Fallback: if upstream serves HTML directly, keep its url.
  return r.url;
}

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  try {
    const subdomain = req.query && req.query.subdomain ? String(req.query.subdomain) : "";
    const requestedPath = req.query && req.query.path ? String(req.query.path) : "";
    const debug = req.query && String(req.query.debug || "") === "1";

    if (!subdomain) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Faltou subdomain");
      return;
    }

    // This endpoint is public (verify_jwt = false) and will redirect to Storage index.html
    const serveUrl = `https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/rendizy-public/client-sites/serve/${encodeURIComponent(
      subdomain
    )}`;

    const indexUrl = await resolveStorageIndexUrl(serveUrl);
    const resp = await fetch(indexUrl, { redirect: "follow" });

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      res.statusCode = 502;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      const dbg = debug ? `\n\n[debug]\nindexUrl=${indexUrl}` : "";
      res.end(`Falha ao buscar site (upstream ${resp.status}).\n${body}${dbg}`);
      return;
    }

    const baseUrl = indexUrl.replace(/\/index\.html(\?.*)?$/i, "");

    // Asset requests: proxy from Storage through Vercel (avoids CORS/module-script issues).
    if (requestedPath && requestedPath !== "/") {
      const clean = cleanRequestedPath(requestedPath);
      if (!clean) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("Path inválido");
        return;
      }

      const assetUrl = buildUpstreamAssetUrl(baseUrl, clean, req);
      const assetResp = await fetch(assetUrl, { redirect: "follow" });

      if (!assetResp.ok) {
        const body = await assetResp.text().catch(() => "");
        res.statusCode = 502;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        const dbg = debug
          ? `\n\n[debug]\nindexUrl=${indexUrl}\nbaseUrl=${baseUrl}\nassetUrl=${assetUrl}`
          : "";
        res.end(`Falha ao buscar asset (upstream ${assetResp.status}).\n${body}${dbg}`);
        return;
      }

      const buf = Buffer.from(await assetResp.arrayBuffer());
      const upstreamCt = assetResp.headers.get("content-type");
      const guessed = contentTypeForPath(clean);
      const ct =
        !upstreamCt ||
        /^text\/plain\b/i.test(upstreamCt) ||
        /^application\/octet-stream\b/i.test(upstreamCt)
          ? guessed
          : upstreamCt;

      res.statusCode = 200;
      res.setHeader("Content-Type", ct);
      res.setHeader(
        "Cache-Control",
        clean.startsWith("assets/") ? "public, max-age=31536000, immutable" : "public, max-age=3600"
      );
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.end(buf);
      return;
    }

    const html = await resp.text();
    const patched = patchHtmlForSubpath(html, `/site/${encodeURIComponent(subdomain)}/`);

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=60");
    res.setHeader("Content-Security-Policy", buildCsp());
    res.setHeader("X-Content-Type-Options", "nosniff");

    res.end(patched);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(`Erro ao servir site: ${err?.message || String(err)}`);
  }
}
