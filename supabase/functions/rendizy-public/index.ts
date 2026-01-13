// supabase/functions/rendizy-public/index.ts
// Public (no-JWT) endpoints used by client public sites.
// IMPORTANT: keep scope minimal. Do NOT mount internal/admin routes here.

// NOTE (Supabase Edge / Deno runtime):
// This file is bundled/executed by Deno (not Node). Use `npm:` specifiers for npm packages.
// If you switch these imports back to bare specifiers (e.g. "hono"), `supabase functions deploy`
// may fail to bundle and changes won't reach production.

import { Hono, type Context } from "npm:hono";
import JSZip from "npm:jszip";
import { createClient } from "npm:@supabase/supabase-js";
import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from "../rendizy-server/utils-env.ts";

type ClientSiteRow = {
  organization_id: string;
  site_name: string;
  subdomain: string;
  domain: string | null;
  is_active: boolean;
  archive_path: string | null;
  extracted_base_url: string | null;
  extracted_files_count: number | null;
};

// @ts-ignore: PropertyRow reservado para uso futuro
type PropertyRow = {
  id: string;
  name: string | null;
  code: string | null;
  type: string | null;
  status: string | null;
  address_city: string | null;
  address_state: string | null;
  address_street: string | null;
  address_number: string | null;
  address_zip_code: string | null;
  address_neighborhood: string | null;
  address_country: string | null;
  address_latitude: number | null;
  address_longitude: number | null;
  pricing_base_price: number | null;
  pricing_currency: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  max_guests: number | null;
  area: number | null;
  description: string | null;
  short_description: string | null;
  photos: unknown;
  cover_photo: unknown;
  tags: unknown;
  amenities: unknown;
  created_at: string;
  updated_at: string;
};

const PUBLIC_CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers":
    "Content-Type, Authorization, X-Requested-With, apikey, X-Auth-Token, x-client-info, Prefer",
  "access-control-max-age": "86400",
};

function withCorsHeaders(headers: Record<string, string>) {
  return {
    ...PUBLIC_CORS_HEADERS,
    ...headers,
  };
}

function getSupabaseAdminClient() {
  if (!SUPABASE_URL) throw new Error("SUPABASE_URL missing");
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-client-info": "rendizy-public/1" } },
  });
}

function isSafeZipPath(p: string): boolean {
  if (!p) return false;
  const path = p.replace(/\\/g, "/");
  if (path.includes("\u0000")) return false;
  if (path.startsWith("/")) return false;
  if (/^[a-zA-Z]:\//.test(path)) return false;
  const parts = path.split("/").filter(Boolean);
  if (parts.some((seg) => seg === ".." || seg === ".")) return false;
  return true;
}

function contentTypeForPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    js: "application/javascript",
    mjs: "application/javascript",
    css: "text/css",
    html: "text/html",
    htm: "text/html",
    json: "application/json",
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
  };

  const base = map[ext] || "application/octet-stream";
  if (base === "application/javascript") return "application/javascript; charset=utf-8";
  if (base === "text/css") return "text/css; charset=utf-8";
  if (base === "text/html") return "text/html; charset=utf-8";
  if (base === "application/json") return "application/json; charset=utf-8";
  return base;
}

function numberOrZero(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isYmd(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function ymdToDateUtc(value: string): Date | null {
  if (!isYmd(value)) return null;
  const d = new Date(value + "T00:00:00.000Z");
  if (!Number.isFinite(d.getTime())) return null;
  // Ensure it's not a coercion like 2025-02-31 -> 2025-03-03
  const roundTrip = d.toISOString().slice(0, 10);
  if (roundTrip !== value) return null;
  return d;
}

function dateUtcToYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDaysUtc(d: Date, days: number): Date {
  const next = new Date(d.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function enumerateYmdRangeInclusive(fromYmd: string, toYmd: string, maxDays: number): string[] {
  const from = ymdToDateUtc(fromYmd);
  const to = ymdToDateUtc(toYmd);
  if (!from || !to) return [];
  if (from.getTime() > to.getTime()) return [];

  const days: string[] = [];
  let cur = from;
  for (let i = 0; i <= maxDays; i++) {
    const ymd = dateUtcToYmd(cur);
    days.push(ymd);
    if (ymd === toYmd) break;
    cur = addDaysUtc(cur, 1);
  }

  return days;
}

function ymdGte(a: string, b: string): boolean {
  return a >= b;
}

function ymdLt(a: string, b: string): boolean {
  return a < b;
}

function parseJsonIfPossible(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const s = value.trim();
  if (!s) return value;
  if (
    (s.startsWith("{") && s.endsWith("}")) ||
    (s.startsWith("[") && s.endsWith("]"))
  ) {
    try {
      return JSON.parse(s);
    } catch {
      return value;
    }
  }
  return value;
}

function normalizePublicTitle(d: any): string | null {
  const raw = parseJsonIfPossible(
    d?.descricao_titulo ?? d?.titulo_publico ?? d?.publicTitle ?? d?.public_title ?? null
  );

  if (raw && typeof raw === "object") {
    const obj: any = raw;
    const candidates = [obj?.pt, obj?.en, obj?.es];
    for (const v of candidates) {
      if (typeof v === "string" && v.trim()) return v.trim();
    }
  }

  if (typeof raw === "string" && raw.trim()) return raw.trim();
  return null;
}

function normalizePricing(d: any): {
  basePrice: number;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  currency: string;
  cleaningFee: number;
  serviceFee: number;
  petFee: number;
  minNights: number;
} {
  const daily = numberOrZero(
    d?.pricing?.dailyRate ??
      d?.pricing?.basePrice ??
      d?.pricing?.base_price ??
      d?.preco_base_noite ??
      d?.precoBaseNoite ??
      d?.dailyRate ??
      d?.basePrice ??
      d?.base_price ??
      d?.price ??
      d?.valor_diaria ??
      0
  );

  // Taxas adicionais (mapeamento Rendizy)
  const cleaningFee = numberOrZero(
    d?.taxa_limpeza ?? d?.taxaLimpeza ?? d?.cleaningFee ?? d?.cleaning_fee ?? 0
  );
  const serviceFee = numberOrZero(
    d?.taxa_servicos_extras ?? d?.taxaServicosExtras ?? d?.serviceFee ?? d?.service_fee ?? 0
  );
  const petFee = numberOrZero(
    d?.taxa_pet ?? d?.taxaPet ?? d?.petFee ?? d?.pet_fee ?? 0
  );
  const minNights = Math.max(1, numberOrZero(
    d?.minimoNoites ?? d?.minNights ?? d?.min_nights ?? d?.restrictions?.minNights ?? 1
  ));

  // Preços semanais/mensais reais se definidos, senão calcula
  const weeklyRate = numberOrZero(
    d?.preco_semanal ?? d?.precoSemanal ?? d?.weeklyRate ?? d?.weekly_rate ?? 0
  ) || daily * 7;
  const monthlyRate = numberOrZero(
    d?.preco_mensal ?? d?.precoMensal ?? d?.monthlyRate ?? d?.monthly_rate ?? 0
  ) || daily * 30;

  // Contract strategy (scalable): always return daily/weekly/monthly even if 0.
  // This avoids UI NaN issues across client sites while we evolve upstream pricing.
  return {
    basePrice: daily,
    dailyRate: daily,
    weeklyRate,
    monthlyRate,
    currency: d?.pricing?.currency || d?.currency || d?.moeda || "BRL",
    cleaningFee,
    serviceFee,
    petFee,
    minNights,
  };
}

function normalizeAnuncioPhotos(d: any): { photos: string[]; coverPhoto: string | null } {
  const roomPhotos: any[] = Array.isArray(d?.rooms)
    ? (d.rooms as any[]).flatMap((r) => (Array.isArray(r?.photos) ? r.photos : []))
    : [];

  const raw: any[] = Array.isArray(d?.fotos)
    ? d.fotos
    : Array.isArray(d?.photos)
    ? d.photos
    : d?.fotoPrincipal
    ? [d.fotoPrincipal]
    : roomPhotos;

  const urls: string[] = raw
    .map((p) => {
      if (!p) return null;
      if (typeof p === "string") return p;
      if (typeof p?.url === "string") return p.url;
      return null;
    })
    .filter((u): u is string => !!u);

  const coverPhotoId = d?.cover_photo_id || d?.coverPhotoId || null;
  const coverFromRooms = coverPhotoId ? roomPhotos.find((p) => p?.id === coverPhotoId) : null;
  const coverUrl =
    (typeof coverFromRooms?.url === "string" ? coverFromRooms.url : null) ||
    (typeof d?.fotoPrincipal === "string" ? d.fotoPrincipal : null) ||
    (typeof d?.coverPhoto === "string" ? d.coverPhoto : null) ||
    (urls.length > 0 ? urls[0] : null);

  return { photos: urls, coverPhoto: coverUrl };
}

function maxGuestsPerBedKey(key: string): number {
  const k = (key || "").toLowerCase();
  if (!k) return 0;
  if (k.includes("solteiro")) return 1;
  if (k.includes("berco") || k.includes("berço")) return 1;
  if (k.includes("beliche")) return 2;
  if (k.includes("sofa") || k.includes("sofá")) return 2;
  if (k.includes("king") || k.includes("queen")) return 2;
  if (k.includes("casal") || k.includes("dupla") || k.includes("double")) return 2;
  if (k.includes("colchao") || k.includes("colchão")) return 1;
  return 1;
}

function computeMaxGuestsFromBedsMap(beds: any): number {
  if (!beds || typeof beds !== "object") return 0;
  let total = 0;
  for (const [key, rawCount] of Object.entries(beds)) {
    const count = numberOrZero(rawCount);
    if (count <= 0) continue;
    const per = maxGuestsPerBedKey(String(key));
    total += count * per;
  }
  return total;
}

function computeMaxGuestsFromAnuncioData(d: any): number {
  const fromTopLevelBeds = computeMaxGuestsFromBedsMap(d?.beds);
  let fromRooms = 0;
  if (Array.isArray(d?.rooms)) {
    for (const r of d.rooms as any[]) {
      fromRooms += computeMaxGuestsFromBedsMap(r?.beds);
    }
  }
  return Math.max(fromTopLevelBeds, fromRooms);
}

async function ensureExtractedToPublicStorage(args: {
  supabase: ReturnType<typeof getSupabaseAdminClient>;
  site: ClientSiteRow;
}): Promise<{ publicBaseUrl: string; indexUrl: string; extractedFilesCount: number }> {
  const { supabase, site } = args;

  const bucketName = "client-sites";
  const supabaseUrl = (SUPABASE_URL || "").replace(/\/+$/, "");
  const publicBaseUrl = `${supabaseUrl}/storage/v1/object/public/${bucketName}`;
  const orgId = site.organization_id;
  // IMPORTANT: redirect must follow the persisted base URL when available.
  // This avoids broken redirects if the storage base changes across deployments.
  const effectiveBaseUrl = site.extracted_base_url || publicBaseUrl;
  const indexUrl = `${effectiveBaseUrl}/${orgId}/extracted/dist/index.html`;

  if (site.extracted_base_url && (site.extracted_files_count || 0) > 0) {
    return {
      publicBaseUrl: site.extracted_base_url,
      indexUrl,
      extractedFilesCount: site.extracted_files_count || 0,
    };
  }

  if (!site.archive_path) {
    throw new Error("Site sem archive_path para extração");
  }

  const { data: zipBlob, error: downloadError } = await supabase.storage
    .from(bucketName)
    .download(site.archive_path);

  if (downloadError || !zipBlob) {
    throw new Error(`Erro ao baixar archive: ${downloadError?.message || "unknown"}`);
  }

  const arrayBuffer = await zipBlob.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  let uploadedCount = 0;
  let skippedCount = 0;
  const MAX_EXTRACTED_FILES = 2000;

  for (const [zipPathRaw, zipFile] of Object.entries(zip.files)) {
    const zipPath = (zipPathRaw || "").replace(/\\/g, "/");
    if (zipFile.dir || zipPath.startsWith(".") || zipPath.includes("__MACOSX")) continue;
    if (!isSafeZipPath(zipPath)) {
      skippedCount++;
      continue;
    }

    const pathParts = zipPath.split("/");
    const distIndex = pathParts.findIndex((p) => p.toLowerCase() === "dist");
    if (distIndex < 0) {
      skippedCount++;
      continue;
    }

    const normalizedPath = pathParts.slice(distIndex).join("/");
    const normalizedLower = normalizedPath.toLowerCase();
    if (!normalizedLower.startsWith("dist/")) {
      skippedCount++;
      continue;
    }
    if (normalizedLower.endsWith(".map")) {
      skippedCount++;
      continue;
    }
    if (!isSafeZipPath(normalizedPath)) {
      skippedCount++;
      continue;
    }
    if (uploadedCount >= MAX_EXTRACTED_FILES) break;

    const storagePath = `${orgId}/extracted/${normalizedPath}`;

    try {
      const content = await zipFile.async("arraybuffer");
      const contentType = contentTypeForPath(normalizedPath);
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(storagePath, content, {
          contentType,
          cacheControl: "public, max-age=31536000",
          upsert: true,
        });

      if (uploadError) {
        skippedCount++;
        continue;
      }

      uploadedCount++;
    } catch {
      skippedCount++;
    }
  }

  await supabase
    .from("client_sites")
    .update({
      extracted_base_url: publicBaseUrl,
      extracted_files_count: uploadedCount,
      updated_at: new Date().toISOString(),
    })
    .eq("organization_id", orgId)
    .eq("subdomain", site.subdomain);

  console.log(
    `[RENIDZY-PUBLIC] extracted ${uploadedCount} files (skipped ${skippedCount}) for ${site.subdomain}`
  );

  return { publicBaseUrl, indexUrl, extractedFilesCount: uploadedCount };
}

const clientSites = new Hono();

clientSites.options("/*", (c: Context) => c.text("", 200, withCorsHeaders({})));

// ============================================================
// PUBLIC: Serve client site (redirect to Storage-hosted dist)
// GET /client-sites/serve/:subdomain
// ============================================================
clientSites.get("/serve/:subdomain", async (c: Context) => {
  try {
    const subdomain = (c.req.param("subdomain") || "").trim().toLowerCase();
    if (!subdomain) {
      return c.text(
        "Subdomain ausente",
        400,
        withCorsHeaders({ "Content-Type": "text/plain; charset=utf-8" })
      );
    }

    const supabase = getSupabaseAdminClient();
    const { data: sqlSite, error: sqlError } = await supabase
      .from("client_sites")
      .select(
        "organization_id,site_name,subdomain,domain,is_active,archive_path,extracted_base_url,extracted_files_count"
      )
      .eq("subdomain", subdomain)
      .eq("is_active", true)
      .maybeSingle();

    if (sqlError || !sqlSite) {
      return c.text(
        "Site não encontrado",
        404,
        withCorsHeaders({ "Content-Type": "text/plain; charset=utf-8" })
      );
    }

    const site = sqlSite as ClientSiteRow;
    const { indexUrl } = await ensureExtractedToPublicStorage({ supabase, site });
    return c.redirect(indexUrl, 302);
  } catch (err) {
    return c.text(
      `Erro ao servir site: ${err instanceof Error ? err.message : String(err)}`,
      500,
      withCorsHeaders({ "Content-Type": "text/plain; charset=utf-8" })
    );
  }
});

// ============================================================
// PUBLIC: Properties API for client site
// GET /client-sites/api/:subdomain/properties
// ============================================================
clientSites.get("/api/:subdomain/properties", async (c: Context) => {
  try {
    const subdomain = (c.req.param("subdomain") || "").trim().toLowerCase();
    const supabase = getSupabaseAdminClient();

    const { data: sqlSite, error: sqlError } = await supabase
      .from("client_sites")
      .select("organization_id,subdomain,is_active")
      .eq("subdomain", subdomain)
      .eq("is_active", true)
      .maybeSingle();

    if (sqlError || !sqlSite) {
      return c.json(
        { success: false, error: "Site não encontrado" },
        404,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const organizationId = (sqlSite as { organization_id: string }).organization_id;

    // NOTA: Tabela `properties` foi depreciada. Usar apenas `properties` como fonte de dados.
    const { data: anuncios, error: anunciosError } = await supabase
      .from("properties")
      .select("id,status,organization_id,data,created_at,updated_at")
      .eq("organization_id", organizationId)
      .in("status", ["active", "published"])
      .order("updated_at", { ascending: false })
      .limit(100);

    if (anunciosError) {
      return c.json(
        { success: false, error: "Erro ao buscar imóveis", details: anunciosError.message },
        500,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const formatted = (anuncios as any[] | null | undefined || []).map((row) => {
      const d = (row as any)?.data || {};
      const { photos, coverPhoto } = normalizeAnuncioPhotos(d);
      const pricing = normalizePricing(d);
      const derivedMaxGuests = computeMaxGuestsFromAnuncioData(d);
      const explicitMaxGuests = numberOrZero(d.guests ?? d.maxGuests ?? d.max_guests ?? d.hospedes ?? 0);
      const maxGuests = Math.max(explicitMaxGuests, derivedMaxGuests);
      const publicTitle = normalizePublicTitle(d);

      return {
        id: row.id,
        name: publicTitle || d.name || d.title || d.internalId || "Imóvel",
        code: d.codigo || d.propertyCode || d?.externalIds?.staysnet_listing_code || row.id,
        type: d.type || d.tipoAcomodacao || d.tipoLocal || "apartment",
        status: row.status || d.status || "active",
        address: {
          city: d?.address?.city || d.cidade || null,
          state: d?.address?.state || d.sigla_estado || null,
          street: d?.address?.street || d.rua || null,
          number: d?.address?.number || d.numero || null,
          neighborhood: d?.address?.neighborhood || d.bairro || null,
          zipCode: d?.address?.zipCode || d.cep || null,
          country: d?.address?.country || d.pais || "BR",
          latitude: d?.address?.latitude ?? null,
          longitude: d?.address?.longitude ?? null,
        },
        pricing,
        capacity: {
          bedrooms:
            numberOrZero(d.bedrooms ?? d.quartos ?? 0) ||
            (Array.isArray(d.rooms) ? d.rooms.length : 0) ||
            0,
          bathrooms: Number(d.bathrooms ?? d.banheiros ?? 0) || 0,
          maxGuests,
          area: Number(d.area ?? 0) || null,
        },
        description: d.description || d.shortDescription || "",
        shortDescription: d.shortDescription || null,
        photos,
        coverPhoto,
        tags: Array.isArray(d.tags) ? d.tags : [],
        amenities: Array.isArray(d.comodidades)
          ? d.comodidades
          : Array.isArray(d.amenities)
          ? d.amenities
          : Array.isArray(d.comodidadesStaysnetIds)
          ? d.comodidadesStaysnetIds
          : [],
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });

    return c.json(
      { success: true, data: formatted, total: formatted.length },
      200,
      withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
    );
  } catch (err) {
    return c.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      500,
      withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
    );
  }
});

// ============================================================
// PUBLIC: Site config (branding/contato/features)
// GET /client-sites/api/:subdomain/site-config
// ============================================================
clientSites.get("/api/:subdomain/site-config", async (c: Context) => {
  try {
    const subdomain = (c.req.param("subdomain") || "").trim().toLowerCase();
    const supabase = getSupabaseAdminClient();

    const { data: sqlSite, error: sqlError } = await supabase
      .from("client_sites")
      .select(
        "organization_id,site_name,subdomain,domain,is_active,theme,logo_url,favicon_url,site_config,features,updated_at"
      )
      .eq("subdomain", subdomain)
      .eq("is_active", true)
      .maybeSingle();

    if (sqlError || !sqlSite) {
      return c.json(
        { success: false, error: "Site não encontrado" },
        404,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const row: any = sqlSite;
    const data = {
      organizationId: row.organization_id,
      siteName: row.site_name,
      subdomain: row.subdomain,
      domain: row.domain || null,
      theme: row.theme || {},
      logo: row.logo_url || null,
      favicon: row.favicon_url || null,
      siteConfig: row.site_config || {},
      features: row.features || {},
      updatedAt: row.updated_at || null,
    };

    return c.json(
      { success: true, data },
      200,
      withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
    );
  } catch (err) {
    return c.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      500,
      withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
    );
  }
});

// ============================================================
// PUBLIC: Availability + pricing per day (stable)
// GET /client-sites/api/:subdomain/properties/:propertyId/availability?from=YYYY-MM-DD&to=YYYY-MM-DD
// ============================================================
clientSites.get("/api/:subdomain/properties/:propertyId/availability", async (c: Context) => {
  try {
    const subdomain = (c.req.param("subdomain") || "").trim().toLowerCase();
    const propertyId = (c.req.param("propertyId") || "").trim();
    const from = (c.req.query("from") || "").trim();
    const to = (c.req.query("to") || "").trim();

    if (!subdomain || !propertyId) {
      return c.json(
        { success: false, error: "Parâmetros inválidos" },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    if (!from || !to) {
      return c.json(
        { success: false, error: "from e to são obrigatórios" },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const fromDate = ymdToDateUtc(from);
    const toDate = ymdToDateUtc(to);
    if (!fromDate || !toDate) {
      return c.json(
        { success: false, error: "Formato de data inválido (use YYYY-MM-DD)" },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    if (fromDate.getTime() > toDate.getTime()) {
      return c.json(
        { success: false, error: "Intervalo inválido (from > to)" },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    // Guardrail: endpoint público não deve permitir ranges gigantes.
    const MAX_DAYS = 370;
    const days = enumerateYmdRangeInclusive(from, to, MAX_DAYS);
    if (days.length === 0) {
      return c.json(
        { success: false, error: "Intervalo inválido" },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }
    if (days.length > MAX_DAYS + 1) {
      return c.json(
        { success: false, error: `Intervalo muito grande (max ${MAX_DAYS} dias)` },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const supabase = getSupabaseAdminClient();

    const { data: sqlSite, error: sqlError } = await supabase
      .from("client_sites")
      .select("organization_id,subdomain,is_active")
      .eq("subdomain", subdomain)
      .eq("is_active", true)
      .maybeSingle();

    if (sqlError || !sqlSite) {
      return c.json(
        { success: false, error: "Site não encontrado" },
        404,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const organizationId = (sqlSite as { organization_id: string }).organization_id;

    // NOTA: Tabela `properties` foi depreciada. Usar apenas `properties`.
    let pricing = { dailyRate: 0, currency: "BRL" };
    {
      const { data: anuncio, error: anuncioErr } = await supabase
        .from("properties")
        .select("id,organization_id,data")
        .eq("organization_id", organizationId)
        .eq("id", propertyId)
        .maybeSingle();

      if (!anuncioErr && anuncio) {
        const d = (anuncio as any)?.data || {};
        const p = normalizePricing(d);
        pricing = { dailyRate: numberOrZero(p.dailyRate), currency: p.currency || "BRL" };
      }
    }

    // Pull blocks/reservations exactly like internal calendar uses (SQL tables).
    const [{ data: blockRows, error: blocksError }, { data: reservationRows, error: reservationsError }] =
      await Promise.all([
        supabase
          .from("blocks")
          .select("id,start_date,end_date,subtype,reason")
          .eq("organization_id", organizationId)
          .eq("property_id", propertyId)
          .lte("start_date", to)
          .gte("end_date", from)
          .order("start_date", { ascending: true }),
        supabase
          .from("reservations")
          .select("id,check_in,check_out,status")
          .eq("organization_id", organizationId)
          .eq("property_id", propertyId)
          .in("status", ["pending", "confirmed", "checked_in"])
          .lte("check_in", to)
          .gte("check_out", from)
          .order("check_in", { ascending: true }),
      ]);

    if (blocksError) {
      return c.json(
        { success: false, error: "Erro ao buscar bloqueios", details: blocksError.message },
        500,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }
    if (reservationsError) {
      return c.json(
        { success: false, error: "Erro ao buscar reservas", details: reservationsError.message },
        500,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const blocks = (blockRows as any[] | null | undefined) || [];
    const reservations = (reservationRows as any[] | null | undefined) || [];

    // Determine per-day availability (night-based): day is unavailable if day >= start && day < end.
    const dayItems = days.map((day) => {
      const reservation = reservations.find((r) => {
        const s = String(r?.check_in || "").slice(0, 10);
        const e = String(r?.check_out || "").slice(0, 10);
        if (!isYmd(s) || !isYmd(e)) return false;
        return ymdGte(day, s) && ymdLt(day, e);
      });

      const block = blocks.find((b) => {
        const s = String(b?.start_date || "").slice(0, 10);
        const e = String(b?.end_date || "").slice(0, 10);
        if (!isYmd(s) || !isYmd(e)) return false;
        return ymdGte(day, s) && ymdLt(day, e);
      });

      const blockSubtype = String((block as any)?.subtype || "").toLowerCase();
      const isReservationBlock = blockSubtype === "reservation";

      const state = reservation
        ? "reserved"
        : block
          ? (isReservationBlock ? "reserved" : "blocked")
          : "available";

      return {
        date: day,
        available: state === "available",
        state,
        price: numberOrZero(pricing.dailyRate),
        currency: pricing.currency,
        reason: state === "blocked" ? (block as any)?.reason || null : null,
      };
    });

    const summary = dayItems.reduce(
      (acc, d) => {
        if (d.state === "available") acc.availableDays++;
        else if (d.state === "blocked") acc.blockedDays++;
        else if (d.state === "reserved") acc.reservedDays++;
        return acc;
      },
      { availableDays: 0, blockedDays: 0, reservedDays: 0 }
    );

    return c.json(
      {
        success: true,
        data: {
          propertyId,
          from,
          to,
          pricing: {
            dailyRate: numberOrZero(pricing.dailyRate),
            currency: pricing.currency,
            // Nota: preços customizados (KV) ainda não fazem parte do contrato público.
            source: "baseDailyRate",
          },
          availability: dayItems,
          summary,
          generatedAt: new Date().toISOString(),
        },
      },
      200,
      withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
    );
  } catch (err) {
    return c.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      500,
      withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
    );
  }
});

// ============================================================
// PUBLIC: Calendar endpoint (alias for client-site compatibility)
// GET /client-sites/api/:subdomain/calendar?propertyId=xxx&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// Returns availability in format expected by Bolt.new sites
// ============================================================
clientSites.get("/api/:subdomain/calendar", async (c: Context) => {
  try {
    const subdomain = (c.req.param("subdomain") || "").trim().toLowerCase();
    const propertyId = (c.req.query("propertyId") || "").trim();
    const startDate = (c.req.query("startDate") || "").trim();
    const endDate = (c.req.query("endDate") || "").trim();

    if (!subdomain || !propertyId) {
      return c.json(
        { success: false, error: "Parâmetros inválidos (subdomain, propertyId)" },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    if (!startDate || !endDate) {
      return c.json(
        { success: false, error: "startDate e endDate são obrigatórios" },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const fromDate = ymdToDateUtc(startDate);
    const toDate = ymdToDateUtc(endDate);
    if (!fromDate || !toDate) {
      return c.json(
        { success: false, error: "Formato de data inválido (use YYYY-MM-DD)" },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    if (fromDate.getTime() > toDate.getTime()) {
      return c.json(
        { success: false, error: "Intervalo inválido (startDate > endDate)" },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const MAX_DAYS = 370;
    const days = enumerateYmdRangeInclusive(startDate, endDate, MAX_DAYS);
    if (days.length === 0 || days.length > MAX_DAYS + 1) {
      return c.json(
        { success: false, error: `Intervalo inválido (max ${MAX_DAYS} dias)` },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const supabase = getSupabaseAdminClient();

    // Validate site + org
    const { data: sqlSite, error: sqlError } = await supabase
      .from("client_sites")
      .select("organization_id")
      .eq("subdomain", subdomain)
      .eq("is_active", true)
      .maybeSingle();

    if (sqlError || !sqlSite) {
      return c.json(
        { success: false, error: "Site não encontrado" },
        404,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const orgId = sqlSite.organization_id;

    // Validate property belongs to org
    const { data: propRow, error: propError } = await supabase
      .from("properties")
      .select("id, data")
      .eq("id", propertyId)
      .eq("organization_id", orgId)
      .maybeSingle();

    if (propError || !propRow) {
      return c.json(
        { success: false, error: "Imóvel não encontrado" },
        404,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const propData = propRow.data || {};
    // Use normalizePricing to get real values from anuncio
    const pricing = normalizePricing(propData);
    const baseDailyRate = pricing.dailyRate;
    const defaultMinNights = pricing.minNights;

    // Fetch blocks and reservations
    const [{ data: blockRows }, { data: reservationRows }] = await Promise.all([
      supabase
        .from("blocks")
        .select("start_date, end_date")
        .eq("property_id", propertyId)
        .gte("end_date", startDate)
        .lte("start_date", endDate),
      supabase
        .from("reservations")
        .select("check_in, check_out")
        .eq("property_id", propertyId)
        .in("status", ["confirmed", "pending"])
        .gte("check_out", startDate)
        .lte("check_in", endDate),
    ]);

    const blocks = (blockRows as any[] | null | undefined) || [];
    const reservations = (reservationRows as any[] | null | undefined) || [];

    // Build days array in format expected by Bolt sites
    const daysResult = days.map((ymd) => {
      const block = blocks.find((b) => {
        const s = String(b.start_date).slice(0, 10);
        const e = String(b.end_date).slice(0, 10);
        return ymd >= s && ymd < e;
      });

      const reservation = reservations.find((r) => {
        const s = String(r.check_in).slice(0, 10);
        const e = String(r.check_out).slice(0, 10);
        return ymd >= s && ymd < e;
      });

      let status: "available" | "blocked" | "reserved" = "available";
      if (block) status = "blocked";
      else if (reservation) status = "reserved";

      return {
        propertyId,
        date: ymd,
        status,
        price: baseDailyRate,
        minNights: defaultMinNights,
      };
    });

    // Return in format expected by Bolt sites: { success: true, data: { days: [...] } }
    return c.json(
      { success: true, data: { days: daysResult } },
      200,
      withCorsHeaders({
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      })
    );
  } catch (err) {
    return c.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      500,
      withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
    );
  }
});

// ============================================================
// PUBLIC: Calculate price for a stay (before reservation)
// POST /client-sites/api/:subdomain/calculate-price
// Returns detailed pricing breakdown with real fees
// ============================================================
clientSites.post("/api/:subdomain/calculate-price", async (c: Context) => {
  try {
    const subdomain = (c.req.param("subdomain") || "").trim().toLowerCase();
    if (!subdomain) {
      return c.json(
        { success: false, error: "Subdomain ausente" },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const body = await c.req.json().catch(() => null);
    if (!body) {
      return c.json(
        { success: false, error: "Body JSON inválido" },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const propertyId = (body.propertyId || "").trim();
    const checkIn = (body.checkIn || "").trim();
    const checkOut = (body.checkOut || "").trim();

    if (!propertyId || !checkIn || !checkOut) {
      return c.json(
        { success: false, error: "Campos obrigatórios: propertyId, checkIn, checkOut" },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    if (!isYmd(checkIn) || !isYmd(checkOut)) {
      return c.json(
        { success: false, error: "Formato de data inválido (use YYYY-MM-DD)" },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const checkInDate = ymdToDateUtc(checkIn);
    const checkOutDate = ymdToDateUtc(checkOut);
    if (!checkInDate || !checkOutDate || checkInDate.getTime() >= checkOutDate.getTime()) {
      return c.json(
        { success: false, error: "Check-out deve ser após check-in" },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const supabase = getSupabaseAdminClient();

    // Validate site
    const { data: sqlSite, error: sqlError } = await supabase
      .from("client_sites")
      .select("organization_id")
      .eq("subdomain", subdomain)
      .eq("is_active", true)
      .maybeSingle();

    if (sqlError || !sqlSite) {
      return c.json(
        { success: false, error: "Site não encontrado" },
        404,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const organizationId = (sqlSite as { organization_id: string }).organization_id;

    // Fetch property pricing from properties
    const { data: anuncio } = await supabase
      .from("properties")
      .select("id,data")
      .eq("organization_id", organizationId)
      .eq("id", propertyId)
      .maybeSingle();

    if (!anuncio) {
      return c.json(
        { success: false, error: "Imóvel não encontrado" },
        404,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const d = (anuncio as any)?.data || {};
    const pricing = normalizePricing(d);

    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    // Validate minNights
    if (nights < pricing.minNights) {
      return c.json(
        {
          success: false,
          error: `Este período só aceita reservas com no mínimo ${pricing.minNights} noites.`,
          minNightsRequired: pricing.minNights,
          nightsRequested: nights,
        },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    // Calculate breakdown
    const baseTotal = pricing.dailyRate * nights;
    const cleaningFee = pricing.cleaningFee;
    const serviceFee = pricing.serviceFee;
    const total = baseTotal + cleaningFee + serviceFee;

    return c.json(
      {
        success: true,
        data: {
          propertyId,
          checkIn,
          checkOut,
          nights,
          currency: pricing.currency,
          breakdown: {
            pricePerNight: pricing.dailyRate,
            nightsTotal: baseTotal,
            cleaningFee,
            serviceFee,
          },
          total,
          minNights: pricing.minNights,
        },
      },
      200,
      withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
    );
  } catch (err) {
    return c.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      500,
      withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
    );
  }
});

// ============================================================
// PUBLIC: Create reservation from client site
// POST /client-sites/api/:subdomain/reservations
// ============================================================
clientSites.post("/api/:subdomain/reservations", async (c: Context) => {
  try {
    const subdomain = (c.req.param("subdomain") || "").trim().toLowerCase();
    if (!subdomain) {
      return c.json(
        { success: false, error: "Subdomain ausente" },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const body = await c.req.json().catch(() => null);
    if (!body) {
      return c.json(
        { success: false, error: "Body JSON inválido" },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const propertyId = (body.propertyId || "").trim();
    const checkIn = (body.checkIn || "").trim();
    const checkOut = (body.checkOut || "").trim();
    const guestName = (body.guestName || "").trim();
    const guestEmail = (body.guestEmail || "").trim();
    const guestPhone = (body.guestPhone || "").trim();
    const guestsCount = Number(body.guests) || 1;
    const message = (body.message || "").trim();

    // Validate required fields
    if (!propertyId || !checkIn || !checkOut || !guestName) {
      return c.json(
        { success: false, error: "Campos obrigatórios: propertyId, checkIn, checkOut, guestName" },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    // Validate date format
    if (!isYmd(checkIn) || !isYmd(checkOut)) {
      return c.json(
        { success: false, error: "Formato de data inválido (use YYYY-MM-DD)" },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const checkInDate = ymdToDateUtc(checkIn);
    const checkOutDate = ymdToDateUtc(checkOut);
    if (!checkInDate || !checkOutDate) {
      return c.json(
        { success: false, error: "Data inválida" },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    if (checkInDate.getTime() >= checkOutDate.getTime()) {
      return c.json(
        { success: false, error: "Check-out deve ser após check-in" },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const supabase = getSupabaseAdminClient();

    // Validate site exists
    const { data: sqlSite, error: sqlError } = await supabase
      .from("client_sites")
      .select("organization_id,subdomain,is_active")
      .eq("subdomain", subdomain)
      .eq("is_active", true)
      .maybeSingle();

    if (sqlError || !sqlSite) {
      return c.json(
        { success: false, error: "Site não encontrado" },
        404,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const organizationId = (sqlSite as { organization_id: string }).organization_id;

    // Validate property belongs to this organization
    let propertyExists = false;
    let pricing = { dailyRate: 0, currency: "BRL", cleaningFee: 0, serviceFee: 0, minNights: 1 };

    // Query from properties (source of truth for properties)
    const { data: anuncio } = await supabase
      .from("properties")
      .select("id,data")
      .eq("organization_id", organizationId)
      .eq("id", propertyId)
      .maybeSingle();

    if (anuncio) {
      propertyExists = true;
      const d = (anuncio as any)?.data || {};
      const p = normalizePricing(d);
      pricing = {
        dailyRate: p.dailyRate,
        currency: p.currency || "BRL",
        cleaningFee: p.cleaningFee,
        serviceFee: p.serviceFee,
        minNights: p.minNights,
      };
    }

    if (!propertyExists) {
      return c.json(
        { success: false, error: "Imóvel não encontrado" },
        404,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    // Validate minNights
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    if (nights < pricing.minNights) {
      return c.json(
        { success: false, error: `Este período só aceita reservas com no mínimo ${pricing.minNights} noites.` },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    // Check availability (no overlapping blocks or reservations)
    const [{ data: blockRows }, { data: reservationRows }] = await Promise.all([
      supabase
        .from("blocks")
        .select("id,start_date,end_date")
        .eq("organization_id", organizationId)
        .eq("property_id", propertyId)
        .lt("start_date", checkOut)
        .gt("end_date", checkIn),
      supabase
        .from("reservations")
        .select("id,check_in,check_out")
        .eq("organization_id", organizationId)
        .eq("property_id", propertyId)
        .in("status", ["pending", "confirmed", "checked_in"])
        .lt("check_in", checkOut)
        .gt("check_out", checkIn),
    ]);

    const hasConflict = ((blockRows as any[]) || []).length > 0 || ((reservationRows as any[]) || []).length > 0;
    if (hasConflict) {
      return c.json(
        { success: false, error: "Período indisponível. Já existe reserva ou bloqueio nessas datas." },
        409,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    // Calculate total price with real fees
    // nights was already calculated above for minNights validation
    const baseTotal = pricing.dailyRate * nights;
    const cleaningFee = pricing.cleaningFee;
    const serviceFee = pricing.serviceFee;
    const totalPrice = baseTotal + cleaningFee + serviceFee;

    // Fetch pending reservation settings from organization
    const { data: orgSettings } = await supabase
      .from("organizations")
      .select("pending_reservation_enabled, pending_reservation_timeout_hours")
      .eq("id", organizationId)
      .maybeSingle();

    // Calculate payment expiration (default 24 hours if not configured)
    const timeoutHours = (orgSettings as any)?.pending_reservation_timeout_hours ?? 24;
    const paymentExpiresAt = new Date(Date.now() + timeoutHours * 60 * 60 * 1000).toISOString();

    // Generate reservation ID and code
    const reservationId = crypto.randomUUID();
    const reservationCode = `WEB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    // Create the reservation using correct schema columns
    const { data: newReservation, error: insertError } = await supabase
      .from("reservations")
      .insert({
        id: reservationId,
        organization_id: organizationId,
        property_id: propertyId,
        check_in: checkIn,
        check_out: checkOut,
        nights: nights,
        guests_adults: guestsCount,
        guests_total: guestsCount,
        pricing_price_per_night: pricing.dailyRate,
        pricing_base_total: baseTotal,
        pricing_cleaning_fee: cleaningFee,
        pricing_service_fee: serviceFee,
        pricing_total: totalPrice,
        pricing_currency: pricing.currency,
        status: "pending",
        payment_status: "pending",
        payment_expires_at: paymentExpiresAt,
        platform: "direct",
        notes: message ? `[Site: ${guestName}] ${message}` : `[Site] Reserva via site público`,
        special_requests: guestEmail ? `Email: ${guestEmail}` : null,
        internal_comments: guestPhone ? `Tel: ${guestPhone}` : null,
        created_by: "00000000-0000-0000-0000-000000000001", // System user for public reservations
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id,check_in,check_out,nights,status,pricing_total,pricing_currency,created_at")
      .single();

    if (insertError) {
      console.error("[rendizy-public] Error creating reservation:", insertError);
      return c.json(
        { success: false, error: "Erro ao criar reserva", details: insertError.message },
        500,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    return c.json(
      {
        success: true,
        data: {
          id: (newReservation as any).id,
          reservationCode: reservationCode,
          propertyId,
          checkIn,
          checkOut,
          nights,
          guests: guestsCount,
          totalPrice: (newReservation as any).pricing_total,
          currency: (newReservation as any).pricing_currency,
          status: (newReservation as any).status,
          paymentStatus: "pending",
          paymentExpiresAt: paymentExpiresAt,
          paymentTimeoutHours: timeoutHours,
          createdAt: (newReservation as any).created_at,
          message: `Pré-reserva criada! Finalize o pagamento em até ${timeoutHours} horas para confirmar.`,
        },
      },
      201,
      withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
    );
  } catch (err) {
    console.error("[rendizy-public] Reservation error:", err);
    return c.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      500,
      withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
    );
  }
});

// ============================================================
// PUBLIC: Get available payment methods for this organization
// GET /client-sites/api/:subdomain/payment-methods
// ============================================================
clientSites.get("/api/:subdomain/payment-methods", async (c: Context) => {
  try {
    const subdomain = (c.req.param("subdomain") || "").trim().toLowerCase();
    if (!subdomain) {
      return c.json(
        { success: false, error: "Subdomain ausente" },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const supabase = getSupabaseAdminClient();

    // Load site to get organization
    const { data: site, error: siteError } = await supabase
      .from("client_sites")
      .select("organization_id, is_active")
      .eq("subdomain", subdomain)
      .eq("is_active", true)
      .maybeSingle();

    if (siteError || !site) {
      return c.json(
        { success: false, error: "Site não encontrado" },
        404,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const organizationId = (site as any).organization_id;

    // Load Stripe config
    const { data: stripeConfig } = await supabase
      .from("stripe_configs")
      .select("enabled, payment_methods, priority")
      .eq("organization_id", organizationId)
      .maybeSingle();

    // Load Pagar.me config
    const { data: pagarmeConfig } = await supabase
      .from("pagarme_configs")
      .select("enabled, payment_methods, priority")
      .eq("organization_id", organizationId)
      .maybeSingle();

    // Build available payment methods
    type PaymentMethodOption = {
      id: string;
      label: string;
      gateway: "stripe" | "pagarme";
      icon?: string;
    };

    const PAYMENT_METHOD_LABELS: Record<string, { label: string; icon: string }> = {
      credit_card: { label: "Cartão de Crédito", icon: "💳" },
      pix: { label: "PIX", icon: "📱" },
      boleto: { label: "Boleto Bancário", icon: "📄" },
      paypal: { label: "PayPal", icon: "🅿️" },
    };

    const methods: PaymentMethodOption[] = [];
    const gateways: Array<{ id: string; name: string; enabled: boolean; priority: number; methods: string[] }> = [];

    // Process Stripe
    if (stripeConfig && (stripeConfig as any).enabled) {
      const stripeMethods = ((stripeConfig as any).payment_methods as string[]) || ["credit_card"];
      const priority = (stripeConfig as any).priority ?? 1;
      
      gateways.push({
        id: "stripe",
        name: "Stripe",
        enabled: true,
        priority,
        methods: stripeMethods,
      });

      for (const m of stripeMethods) {
        const info = PAYMENT_METHOD_LABELS[m] || { label: m, icon: "💰" };
        methods.push({
          id: `stripe:${m}`,
          label: info.label,
          gateway: "stripe",
          icon: info.icon,
        });
      }
    }

    // Process Pagar.me
    if (pagarmeConfig && (pagarmeConfig as any).enabled) {
      const pagarmeMethods = ((pagarmeConfig as any).payment_methods as string[]) || ["pix", "boleto"];
      const priority = (pagarmeConfig as any).priority ?? 2;
      
      gateways.push({
        id: "pagarme",
        name: "Pagar.me",
        enabled: true,
        priority,
        methods: pagarmeMethods,
      });

      for (const m of pagarmeMethods) {
        // Don't duplicate if already added by Stripe with same method
        const existing = methods.find((x) => x.id.endsWith(`:${m}`));
        if (!existing) {
          const info = PAYMENT_METHOD_LABELS[m] || { label: m, icon: "💰" };
          methods.push({
            id: `pagarme:${m}`,
            label: info.label,
            gateway: "pagarme",
            icon: info.icon,
          });
        }
      }
    }

    // Sort gateways by priority
    gateways.sort((a, b) => a.priority - b.priority);

    return c.json(
      {
        success: true,
        data: {
          methods,
          gateways,
          hasPaymentEnabled: methods.length > 0,
        },
      },
      200,
      withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
    );
  } catch (err) {
    console.error("[rendizy-public] Payment methods error:", err);
    return c.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      500,
      withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
    );
  }
});

// ============================================================
// PUBLIC: Create Checkout Session from client site (multi-gateway)
// POST /client-sites/api/:subdomain/checkout/session
// ============================================================
clientSites.post("/api/:subdomain/checkout/session", async (c: Context) => {
  try {
    const subdomain = (c.req.param("subdomain") || "").trim().toLowerCase();
    if (!subdomain) {
      return c.json(
        { success: false, error: "Subdomain ausente" },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const body = await c.req.json().catch(() => null);
    if (!body) {
      return c.json(
        { success: false, error: "Body JSON inválido" },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const reservationId = (body.reservationId || "").trim();
    const successUrl = (body.successUrl || "").trim();
    const cancelUrl = (body.cancelUrl || "").trim();
    // New: optional paymentMethod in format "gateway:method" e.g. "stripe:credit_card" or "pagarme:pix"
    const paymentMethod = (body.paymentMethod || "").trim();

    // Validate required fields
    if (!reservationId || !successUrl || !cancelUrl) {
      return c.json(
        { success: false, error: "Campos obrigatórios: reservationId, successUrl, cancelUrl" },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    // Parse payment method if provided
    let requestedGateway: "stripe" | "pagarme" | null = null;
    let requestedMethod: string | null = null;
    if (paymentMethod && paymentMethod.includes(":")) {
      const [gw, method] = paymentMethod.split(":");
      if (gw === "stripe" || gw === "pagarme") {
        requestedGateway = gw;
        requestedMethod = method;
      }
    }

    const supabase = getSupabaseAdminClient();

    // Validate site exists and get organization
    const { data: sqlSite, error: sqlError } = await supabase
      .from("client_sites")
      .select("organization_id,subdomain,is_active")
      .eq("subdomain", subdomain)
      .eq("is_active", true)
      .maybeSingle();

    if (sqlError || !sqlSite) {
      return c.json(
        { success: false, error: "Site não encontrado" },
        404,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const organizationId = (sqlSite as any).organization_id;

    // Load both gateway configs
    const { data: stripeConfig } = await supabase
      .from("stripe_configs")
      .select("enabled, is_test_mode, secret_key_encrypted, payment_methods, priority")
      .eq("organization_id", organizationId)
      .maybeSingle();

    const { data: pagarmeConfig } = await supabase
      .from("pagarme_configs")
      .select("enabled, is_test_mode, secret_key_encrypted, payment_methods, priority")
      .eq("organization_id", organizationId)
      .maybeSingle();

    // Determine which gateway to use
    type GatewayChoice = { type: "stripe" | "pagarme"; config: any };
    let gateway: GatewayChoice | null = null;

    // If specific gateway requested, use it
    if (requestedGateway === "stripe") {
      if (stripeConfig && (stripeConfig as any).enabled && (stripeConfig as any).secret_key_encrypted) {
        gateway = { type: "stripe", config: stripeConfig };
      }
    } else if (requestedGateway === "pagarme") {
      if (pagarmeConfig && (pagarmeConfig as any).enabled && (pagarmeConfig as any).secret_key_encrypted) {
        gateway = { type: "pagarme", config: pagarmeConfig };
      }
    } else {
      // No specific gateway requested - use priority order
      const gateways: Array<{ type: "stripe" | "pagarme"; config: any; priority: number }> = [];
      
      if (stripeConfig && (stripeConfig as any).enabled && (stripeConfig as any).secret_key_encrypted) {
        gateways.push({ type: "stripe", config: stripeConfig, priority: (stripeConfig as any).priority ?? 1 });
      }
      if (pagarmeConfig && (pagarmeConfig as any).enabled && (pagarmeConfig as any).secret_key_encrypted) {
        gateways.push({ type: "pagarme", config: pagarmeConfig, priority: (pagarmeConfig as any).priority ?? 2 });
      }
      
      // Sort by priority (lower = higher priority)
      gateways.sort((a, b) => a.priority - b.priority);
      
      if (gateways.length > 0) {
        gateway = { type: gateways[0].type, config: gateways[0].config };
      }
    }

    if (!gateway) {
      return c.json(
        { success: false, error: "Nenhum gateway de pagamento configurado para esta organização" },
        400,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    // Load reservation for this organization
    const { data: reservation, error: reservationError } = await supabase
      .from("reservations")
      .select("id, pricing_total, pricing_currency, status, property_id, check_in, check_out, nights")
      .eq("id", reservationId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (reservationError || !reservation) {
      return c.json(
        { success: false, error: "Reserva não encontrada" },
        404,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const res = reservation as any;

    // Decrypt secret key using same algorithm as utils-crypto.ts (base64 format)
    // Uses AI_PROVIDER_SECRET or SUPABASE_SERVICE_ROLE_KEY as secret source
    const cryptoSecret = Deno.env.get("AI_PROVIDER_SECRET") 
      || Deno.env.get("RENDAI_SECRET")
      || Deno.env.get("ENCRYPTION_SECRET")
      || SUPABASE_SERVICE_ROLE_KEY
      || SUPABASE_URL; // Fallback

    if (!cryptoSecret) {
      console.error("[rendizy-public] No encryption secret available");
      return c.json(
        { success: false, error: "Configuração de criptografia ausente" },
        500,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    // Helper: decrypt secret key using same algorithm as utils-crypto.ts
    const decryptSecretKey = async (encrypted: string): Promise<string> => {
      const [ivB64, dataB64] = encrypted.split(":");
      if (!ivB64 || !dataB64) {
        throw new Error("Formato de dado criptografado inválido");
      }

      const base64ToBuffer = (b64: string): ArrayBuffer => {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
      };

      const iv = new Uint8Array(base64ToBuffer(ivB64));
      const encryptedBytes = base64ToBuffer(dataB64);
      
      const keyMaterial = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(cryptoSecret)
      );
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyMaterial,
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );
      
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        cryptoKey,
        encryptedBytes
      );
      
      return new TextDecoder().decode(decrypted);
    };

    const amountCents = Math.round((res.pricing_total || 0) * 100);
    const currency = (res.pricing_currency || "brl").toLowerCase();

    // ============================================================
    // STRIPE CHECKOUT
    // ============================================================
    if (gateway.type === "stripe") {
      let secretKey: string;
      try {
        secretKey = await decryptSecretKey(gateway.config.secret_key_encrypted);
      } catch (decryptErr) {
        console.error("[rendizy-public] Stripe decryption failed:", decryptErr);
        return c.json(
          { success: false, error: "Erro ao descriptografar chave do Stripe" },
          500,
          withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
        );
      }

      const stripePayload = new URLSearchParams({
        "mode": "payment",
        "success_url": successUrl,
        "cancel_url": cancelUrl,
        "line_items[0][price_data][currency]": currency,
        "line_items[0][price_data][unit_amount]": String(amountCents),
        "line_items[0][price_data][product_data][name]": `Reserva ${res.check_in} a ${res.check_out} (${res.nights} noites)`,
        "line_items[0][quantity]": "1",
        "metadata[reservation_id]": reservationId,
        "metadata[organization_id]": organizationId,
        "metadata[subdomain]": subdomain,
        "metadata[gateway]": "stripe",
      });

      // Add payment method types based on requested method
      if (requestedMethod === "pix") {
        stripePayload.append("payment_method_types[0]", "pix");
      } else if (requestedMethod === "boleto") {
        stripePayload.append("payment_method_types[0]", "boleto");
      } else if (requestedMethod === "paypal") {
        stripePayload.append("payment_method_types[0]", "paypal");
      } else {
        stripePayload.append("payment_method_types[0]", "card");
      }

      const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: stripePayload.toString(),
      });

      if (!stripeResponse.ok) {
        const stripeError = await stripeResponse.json().catch(() => ({}));
        console.error("[rendizy-public] Stripe API error:", stripeError);
        return c.json(
          { success: false, error: "Erro ao criar sessão de checkout", details: (stripeError as any).error?.message },
          500,
          withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
        );
      }

      const stripeSession = await stripeResponse.json();

      // Store checkout session in database
      const { error: insertError } = await supabase
        .from("stripe_checkout_sessions")
        .insert({
          id: crypto.randomUUID(),
          organization_id: organizationId,
          stripe_session_id: (stripeSession as any).id,
          reservation_id: reservationId,
          amount: amountCents,
          currency: currency,
          status: (stripeSession as any).payment_status || "unpaid",
          checkout_url: (stripeSession as any).url,
          success_url: successUrl,
          cancel_url: cancelUrl,
          metadata: { subdomain, source: "client-site", gateway: "stripe", paymentMethod: requestedMethod },
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("[rendizy-public] Error saving checkout session:", insertError);
      }

      return c.json(
        {
          success: true,
          data: {
            sessionId: (stripeSession as any).id,
            checkoutUrl: (stripeSession as any).url,
            amount: amountCents,
            currency: currency,
            reservationId: reservationId,
            gateway: "stripe",
            paymentMethod: requestedMethod || "credit_card",
          },
        },
        200,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    // ============================================================
    // PAGAR.ME CHECKOUT
    // ============================================================
    if (gateway.type === "pagarme") {
      let secretKey: string;
      try {
        secretKey = await decryptSecretKey(gateway.config.secret_key_encrypted);
      } catch (decryptErr) {
        console.error("[rendizy-public] Pagar.me decryption failed:", decryptErr);
        return c.json(
          { success: false, error: "Erro ao descriptografar chave do Pagar.me" },
          500,
          withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
        );
      }

      // Build Pagar.me order payload
      // Pagar.me uses a different API structure
      const pagarmePayload = {
        items: [
          {
            amount: amountCents,
            description: `Reserva ${res.check_in} a ${res.check_out} (${res.nights} noites)`,
            quantity: 1,
            code: reservationId,
          },
        ],
        payments: [] as any[],
        metadata: {
          reservation_id: reservationId,
          organization_id: organizationId,
          subdomain: subdomain,
          gateway: "pagarme",
        },
      };

      // Configure payment method
      if (requestedMethod === "pix") {
        pagarmePayload.payments.push({
          payment_method: "pix",
          pix: {
            expires_in: 3600, // 1 hour
          },
        });
      } else if (requestedMethod === "boleto") {
        pagarmePayload.payments.push({
          payment_method: "boleto",
          boleto: {
            due_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
            instructions: "Pagar até a data de vencimento",
          },
        });
      } else {
        // credit_card - Pagar.me checkout flow
        pagarmePayload.payments.push({
          payment_method: "checkout",
          checkout: {
            expires_in: 3600,
            billing_address_editable: false,
            customer_editable: true,
            accepted_payment_methods: ["credit_card"],
            success_url: successUrl,
            skip_checkout_success_page: false,
          },
        });
      }

      const pagarmeResponse = await fetch("https://api.pagar.me/core/v5/orders", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${btoa(secretKey + ":")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pagarmePayload),
      });

      if (!pagarmeResponse.ok) {
        const pagarmeError = await pagarmeResponse.json().catch(() => ({}));
        console.error("[rendizy-public] Pagar.me API error:", pagarmeError);
        return c.json(
          { success: false, error: "Erro ao criar pedido no Pagar.me", details: JSON.stringify(pagarmeError) },
          500,
          withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
        );
      }

      const pagarmeOrder = await pagarmeResponse.json();

      // Extract checkout URL or payment info based on method
      let checkoutUrl = "";
      let pixQrCode = null;
      let pixQrCodeUrl = null;
      let boletoUrl = null;
      let boletoBarcode = null;

      const charge = (pagarmeOrder as any).charges?.[0];
      if (charge) {
        if (requestedMethod === "pix" && charge.last_transaction?.qr_code) {
          pixQrCode = charge.last_transaction.qr_code;
          pixQrCodeUrl = charge.last_transaction.qr_code_url;
          checkoutUrl = pixQrCodeUrl || "";
        } else if (requestedMethod === "boleto" && charge.last_transaction?.pdf) {
          boletoUrl = charge.last_transaction.pdf;
          boletoBarcode = charge.last_transaction.line;
          checkoutUrl = boletoUrl;
        } else if (charge.last_transaction?.checkout?.payment_url) {
          checkoutUrl = charge.last_transaction.checkout.payment_url;
        }
      }

      // Store in pagarme_orders table (create if not exists)
      const { error: insertError } = await supabase
        .from("pagarme_orders")
        .upsert({
          id: (pagarmeOrder as any).id || crypto.randomUUID(),
          organization_id: organizationId,
          reservation_id: reservationId,
          amount: amountCents,
          currency: currency,
          status: (pagarmeOrder as any).status || "pending",
          payment_method: requestedMethod || "credit_card",
          checkout_url: checkoutUrl,
          pix_qr_code: pixQrCode,
          pix_qr_code_url: pixQrCodeUrl,
          boleto_url: boletoUrl,
          boleto_barcode: boletoBarcode,
          metadata: { subdomain, source: "client-site" },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "id" });

      if (insertError) {
        console.error("[rendizy-public] Error saving Pagar.me order:", insertError);
      }

      return c.json(
        {
          success: true,
          data: {
            orderId: (pagarmeOrder as any).id,
            checkoutUrl: checkoutUrl,
            amount: amountCents,
            currency: currency,
            reservationId: reservationId,
            gateway: "pagarme",
            paymentMethod: requestedMethod || "credit_card",
            // Extra data for PIX/Boleto
            ...(pixQrCode && { pixQrCode, pixQrCodeUrl }),
            ...(boletoUrl && { boletoUrl, boletoBarcode }),
          },
        },
        200,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    // Fallback - should not reach here
    return c.json(
      { success: false, error: "Gateway não suportado" },
      400,
      withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
    );
  } catch (err) {
    console.error("[rendizy-public] Checkout session error:", err);
    return c.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      500,
      withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
    );
  }
});

// ============================================================
// PUBLIC (PROTO/STUB): Lead capture (planned)
// POST /client-sites/api/:subdomain/leads
// ============================================================
clientSites.post("/api/:subdomain/leads", async (c: Context) => {
  try {
    // Note: protótipo. Não persiste no banco ainda.
    const body = await c.req.json().catch(() => null);
    return c.json(
      {
        success: true,
        data: {
          accepted: true,
          receivedAt: new Date().toISOString(),
          echo: body,
        },
      },
      200,
      withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
    );
  } catch (err) {
    return c.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      500,
      withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
    );
  }
});

// ============================================================
// GUEST AUTH: Login Social para Hóspedes dos Sites
// POST /client-sites/api/:subdomain/auth/guest/google
// ============================================================
clientSites.post("/api/:subdomain/auth/guest/google", async (c: Context) => {
  const subdomain = c.req.param("subdomain");
  
  try {
    const { credential } = await c.req.json();
    
    if (!credential) {
      return c.json(
        { success: false, error: "Credential não fornecida" },
        400,
        withCorsHeaders({ "Content-Type": "application/json" })
      );
    }

    // Decodificar token do Google
    const parts = credential.split('.');
    if (parts.length !== 3) {
      return c.json(
        { success: false, error: "Token inválido" },
        401,
        withCorsHeaders({ "Content-Type": "application/json" })
      );
    }

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    let payload;
    try {
      payload = JSON.parse(atob(base64));
    } catch {
      return c.json(
        { success: false, error: "Token malformado" },
        401,
        withCorsHeaders({ "Content-Type": "application/json" })
      );
    }

    // Validar expiração
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return c.json(
        { success: false, error: "Token expirado" },
        401,
        withCorsHeaders({ "Content-Type": "application/json" })
      );
    }

    const supabase = getSupabaseAdminClient();

    // Buscar site pelo subdomain
    const { data: site, error: siteError } = await supabase
      .from("client_sites")
      .select("organization_id")
      .eq("subdomain", subdomain)
      .maybeSingle();

    if (siteError || !site) {
      return c.json(
        { success: false, error: "Site não encontrado" },
        404,
        withCorsHeaders({ "Content-Type": "application/json" })
      );
    }

    const organizationId = site.organization_id;

    // Buscar ou criar guest_user
    let guestUser = null;

    // Tentar encontrar por google_id
    const { data: existingByGoogleId } = await supabase
      .from("guest_users")
      .select("*")
      .eq("google_id", payload.sub)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (existingByGoogleId) {
      guestUser = existingByGoogleId;
      // Atualizar último login
      await supabase
        .from("guest_users")
        .update({ last_login_at: new Date().toISOString() })
        .eq("id", guestUser.id);
    } else {
      // Tentar por email
      const { data: existingByEmail } = await supabase
        .from("guest_users")
        .select("*")
        .eq("email", payload.email)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (existingByEmail) {
        // Atualizar com google_id
        const { data: updated } = await supabase
          .from("guest_users")
          .update({
            google_id: payload.sub,
            avatar_url: payload.picture,
            name: payload.name || existingByEmail.name,
            last_login_at: new Date().toISOString(),
          })
          .eq("id", existingByEmail.id)
          .select()
          .single();
        guestUser = updated;
      } else {
        // Criar novo
        const { data: newUser, error: createError } = await supabase
          .from("guest_users")
          .insert({
            email: payload.email,
            name: payload.name,
            avatar_url: payload.picture,
            google_id: payload.sub,
            organization_id: organizationId,
            email_verified: payload.email_verified,
            last_login_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) {
          console.error("Erro ao criar guest_user:", createError);
          return c.json(
            { success: false, error: "Erro ao criar conta" },
            500,
            withCorsHeaders({ "Content-Type": "application/json" })
          );
        }
        guestUser = newUser;
      }
    }

    if (!guestUser) {
      return c.json(
        { success: false, error: "Erro ao processar login" },
        500,
        withCorsHeaders({ "Content-Type": "application/json" })
      );
    }

    // Gerar token JWT simples
    const header = { alg: "HS256", typ: "JWT" };
    const tokenPayload = {
      sub: guestUser.id,
      email: guestUser.email,
      name: guestUser.name,
      organizationId,
      type: "guest",
      iat: now,
      exp: now + (7 * 24 * 60 * 60), // 7 dias
    };
    const encode = (obj: object) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const unsignedToken = `${encode(header)}.${encode(tokenPayload)}`;
    const signature = btoa(unsignedToken + "rendizy-guest-secret").replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const token = `${unsignedToken}.${signature}`;

    return c.json(
      {
        success: true,
        token,
        user: {
          id: guestUser.id,
          email: guestUser.email,
          name: guestUser.name,
          avatar_url: guestUser.avatar_url,
          phone: guestUser.phone,
        },
      },
      200,
      withCorsHeaders({ "Content-Type": "application/json" })
    );
  } catch (err) {
    console.error("Erro no login Google guest:", err);
    return c.json(
      { success: false, error: err instanceof Error ? err.message : "Erro interno" },
      500,
      withCorsHeaders({ "Content-Type": "application/json" })
    );
  }
});

// ============================================================
// GUEST AUTH: Dados do hóspede logado
// GET /client-sites/api/:subdomain/auth/guest/me
// ============================================================
clientSites.get("/api/:subdomain/auth/guest/me", async (c: Context) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return c.json(
        { success: false, error: "Token não fornecido" },
        401,
        withCorsHeaders({ "Content-Type": "application/json" })
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const parts = token.split('.');
    if (parts.length !== 3) {
      return c.json(
        { success: false, error: "Token inválido" },
        401,
        withCorsHeaders({ "Content-Type": "application/json" })
      );
    }

    let payload;
    try {
      payload = JSON.parse(atob(parts[1]));
    } catch {
      return c.json(
        { success: false, error: "Token malformado" },
        401,
        withCorsHeaders({ "Content-Type": "application/json" })
      );
    }

    // Verificar expiração
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return c.json(
        { success: false, error: "Token expirado" },
        401,
        withCorsHeaders({ "Content-Type": "application/json" })
      );
    }

    if (payload.type !== 'guest') {
      return c.json(
        { success: false, error: "Token inválido para esta rota" },
        403,
        withCorsHeaders({ "Content-Type": "application/json" })
      );
    }

    const supabase = getSupabaseAdminClient();

    const { data: guestUser, error } = await supabase
      .from("guest_users")
      .select("id, email, name, phone, avatar_url, created_at, last_login_at")
      .eq("id", payload.sub)
      .single();

    if (error || !guestUser) {
      return c.json(
        { success: false, error: "Usuário não encontrado" },
        404,
        withCorsHeaders({ "Content-Type": "application/json" })
      );
    }

    return c.json(
      { success: true, user: guestUser },
      200,
      withCorsHeaders({ "Content-Type": "application/json" })
    );
  } catch (err) {
    console.error("Erro no guest/me:", err);
    return c.json(
      { success: false, error: "Erro interno" },
      500,
      withCorsHeaders({ "Content-Type": "application/json" })
    );
  }
});

const app = new Hono();
app.get("/health", (c: Context) =>
  c.json({ ok: true, service: "rendizy-public" }));

// In production, the function name is included in the pathname; support both.
app.route("/rendizy-public/client-sites", clientSites);
app.route("/client-sites", clientSites);

Deno.serve(app.fetch);
