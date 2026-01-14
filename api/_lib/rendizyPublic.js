const SUPABASE_PROJECT_REF = "odcgnzfremrqnvtitpcc";

export function getSupabaseUrl() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    `https://${SUPABASE_PROJECT_REF}.supabase.co`;
  return String(url).replace(/\/+$/, "");
}

export function getClientSitesApiBase(siteSlug) {
  if (!siteSlug) throw new Error("Missing siteSlug");
  return `${getSupabaseUrl()}/functions/v1/rendizy-public/client-sites/api/${encodeURIComponent(
    siteSlug
  )}`;
}

export async function callClientSitesApi(siteSlug, path, { method = "GET", token, body } = {}) {
  const base = getClientSitesApiBase(siteSlug);
  const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }

  return { res, json };
}
