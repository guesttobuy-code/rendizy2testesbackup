import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
  const out = { subdomain: "medhome", port: 4179, mount: "site" };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--subdomain" || a === "-s") out.subdomain = String(argv[++i] || "");
    else if (a === "--port" || a === "-p") out.port = Number(argv[++i] || out.port);
    else if (a === "--mount") out.mount = String(argv[++i] || out.mount);
  }
  out.subdomain = out.subdomain.trim().toLowerCase();
  if (!out.subdomain) throw new Error("--subdomain é obrigatório");
  if (!Number.isFinite(out.port) || out.port <= 0) throw new Error("--port inválido");
  out.mount = (out.mount || "site").replace(/^\/+|\/+$/g, "");
  if (!out.mount) out.mount = "site";
  return out;
}

function loadEnvLocal() {
  const repoRoot = path.resolve(__dirname, "..");
  const candidates = [
    path.join(repoRoot, ".env.local"),
    path.join(repoRoot, "Rendizyoficial-main", ".env.local"),
  ];

  const envPath = candidates.find((p) => existsSync(p));
  if (!envPath) {
    throw new Error(
      `Não achei .env.local em: ${candidates.join(" | ")}. ` +
        "Preciso de SUPABASE_URL (ou VITE_SUPABASE_URL)."
    );
  }

  const raw = readFileSync(envPath, "utf8");
  const lines = raw.split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const k = trimmed.slice(0, idx).trim();
    const v = trimmed.slice(idx + 1).trim();
    env[k] = v;
  }

  const supabaseUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").trim().replace(/\/+$/g, "");
  if (!supabaseUrl) throw new Error("SUPABASE_URL (ou VITE_SUPABASE_URL) não encontrado no .env.local");

  return { envPath, supabaseUrl };
}

function stripQueryAndHash(url) {
  const i = url.indexOf("?");
  const j = url.indexOf("#");
  const cut = Math.min(i === -1 ? url.length : i, j === -1 ? url.length : j);
  return url.slice(0, cut);
}

function withBasePatched(html, baseHref) {
  const baseTag = `<base href="${baseHref}">`;
  const headCloseIdx = html.toLowerCase().indexOf("</head>");

  let out = html;
  if (headCloseIdx !== -1) {
    out = html.slice(0, headCloseIdx) + baseTag + html.slice(headCloseIdx);
  } else {
    out = baseTag + html;
  }

  // Vite às vezes gera refs absolutos (/assets/...). Base tag não afeta URLs absolutas.
  // Então reescrevemos para ficar dentro do mount local.
  out = out
    .replaceAll('src="/assets/', `src="${baseHref}assets/`)
    .replaceAll("src='/assets/", `src='${baseHref}assets/`)
    .replaceAll('href="/assets/', `href="${baseHref}assets/`)
    .replaceAll("href='/assets/", `href='${baseHref}assets/`)
    .replaceAll('href="/favicon', `href="${baseHref}favicon`)
    .replaceAll("href='/favicon", `href='${baseHref}favicon`);

  return out;
}

async function resolveIndexUrl({ supabaseUrl, subdomain }) {
  // A função suporta tanto /client-sites quanto /rendizy-public/client-sites
  const candidates = [
    `${supabaseUrl}/functions/v1/rendizy-public/client-sites/serve/${encodeURIComponent(subdomain)}`,
    `${supabaseUrl}/functions/v1/rendizy-public/rendizy-public/client-sites/serve/${encodeURIComponent(subdomain)}`,
  ];

  let lastErr;
  for (const serveUrl of candidates) {
    try {
      const r = await fetch(serveUrl, { redirect: "manual" });
      const loc = r.headers.get("location");
      if (r.status >= 300 && r.status < 400 && loc) {
        const indexUrl = stripQueryAndHash(loc);
        if (!indexUrl.endsWith("/index.html")) {
          throw new Error(`Location inesperado (não termina com /index.html): ${indexUrl}`);
        }
        const baseUrl = indexUrl.slice(0, -"/index.html".length);
        return { serveUrl, indexUrl, baseUrl };
      }
      const body = await r.text().catch(() => "");
      throw new Error(`Resposta inesperada: HTTP ${r.status}. Body: ${body.slice(0, 200)}`);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function sendText(res, status, text, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(text);
}

function copyHeaders(upstreamHeaders) {
  const h = {};
  for (const [k, v] of upstreamHeaders.entries()) {
    const key = k.toLowerCase();
    if (key === "content-encoding") continue; // evita problemas de gzip/br ao repassar
    if (key === "content-length") continue; // será recalculado
    if (key === "transfer-encoding") continue;
    if (key === "connection") continue;
    h[k] = v;
  }
  // sempre: não cachear HTML local
  return h;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { supabaseUrl, envPath } = loadEnvLocal();
  const { baseUrl, indexUrl, serveUrl } = await resolveIndexUrl({ supabaseUrl, subdomain: args.subdomain });

  const mountPrefix = `/${args.mount}/${args.subdomain}/`;

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

      if (url.pathname === "/") {
        res.writeHead(302, { Location: mountPrefix });
        return res.end();
      }

      if (url.pathname === `/${args.mount}` || url.pathname === `/${args.mount}/`) {
        res.writeHead(302, { Location: mountPrefix });
        return res.end();
      }

      if (url.pathname === mountPrefix || url.pathname === mountPrefix.slice(0, -1)) {
        const upstream = await fetch(indexUrl, { redirect: "follow" });
        const html = await upstream.text();
        const patched = withBasePatched(html, mountPrefix);
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        });
        return res.end(patched);
      }

      if (!url.pathname.startsWith(mountPrefix)) {
        return sendText(res, 404, `Rota não encontrada. Use ${mountPrefix}`);
      }

      const relative = url.pathname.slice(mountPrefix.length);
      const cleanRel = relative.replace(/^\/+/, "");
      const upstreamUrl = `${baseUrl}/${cleanRel}${url.search || ""}`;

      const upstream = await fetch(upstreamUrl, { redirect: "follow" });
      if (!upstream.ok) {
        const body = await upstream.text().catch(() => "");
        return sendText(
          res,
          upstream.status,
          `Upstream falhou: HTTP ${upstream.status}\n${upstreamUrl}\n\n${body.slice(0, 800)}`
        );
      }

      const buf = Buffer.from(await upstream.arrayBuffer());
      const headers = copyHeaders(upstream.headers);
      res.writeHead(200, headers);
      return res.end(buf);
    } catch (err) {
      return sendText(
        res,
        500,
        `Erro local: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  });

  server.listen(args.port, "127.0.0.1", () => {
    // eslint-disable-next-line no-console
    console.log("== serve-client-site-from-supabase ==");
    console.log("env:", envPath);
    console.log("serveUrl:", serveUrl);
    console.log("indexUrl:", indexUrl);
    console.log("baseUrl:", baseUrl);
    console.log("open:", `http://127.0.0.1:${args.port}${mountPrefix}`);
  });
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
