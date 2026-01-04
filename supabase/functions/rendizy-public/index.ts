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

function normalizePricing(d: any): {
  basePrice: number;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  currency: string;
} {
  const daily = numberOrZero(
    d?.pricing?.dailyRate ??
      d?.pricing?.basePrice ??
      d?.dailyRate ??
      d?.basePrice ??
      d?.price ??
      d?.valor_diaria ??
      0
  );

  // Contract strategy (scalable): always return daily/weekly/monthly even if 0.
  // This avoids UI NaN issues across client sites while we evolve upstream pricing.
  return {
    basePrice: daily,
    dailyRate: daily,
    weeklyRate: daily * 7,
    monthlyRate: daily * 30,
    currency: d?.pricing?.currency || d?.currency || "BRL",
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

    // Primary source: `properties` table (classic/curated listings).
    // We intentionally filter by published-like statuses for public sites.
    const { data: properties, error } = await supabase
      .from("properties")
      .select(
        "id, name, code, type, status, address_city, address_state, address_street, address_number, address_zip_code, address_neighborhood, pricing_base_price, pricing_currency, bedrooms, bathrooms, max_guests, area, description, short_description, photos, cover_photo, tags, amenities, created_at, updated_at"
      )
      .eq("organization_id", organizationId)
      // Compat: em alguns ambientes o status publicado pode ser 'active' ou 'published'.
      .in("status", ["active", "published"]) 
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      return c.json(
        { success: false, error: "Erro ao buscar imóveis", details: error.message },
        500,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

    const formatted = (properties as PropertyRow[] | null | undefined || []).map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      type: p.type,
      status: p.status,
      address: {
        city: p.address_city || null,
        state: p.address_state || null,
        street: p.address_street || null,
        number: p.address_number || null,
        neighborhood: p.address_neighborhood || null,
        zipCode: p.address_zip_code || null,
        country: "BR",
        latitude: null,
        longitude: null,
      },
      pricing: {
        basePrice: p.pricing_base_price || 0,
        // Compat (client sites): UI expects `pricing.dailyRate`.
        dailyRate: p.pricing_base_price || 0,
        weeklyRate: (p.pricing_base_price || 0) * 7,
        monthlyRate: (p.pricing_base_price || 0) * 30,
        currency: p.pricing_currency || "BRL",
      },
      capacity: {
        bedrooms: p.bedrooms || 0,
        bathrooms: p.bathrooms || 0,
        maxGuests: p.max_guests || 0,
        area: p.area || null,
      },
      description: p.description || p.short_description || "",
      shortDescription: p.short_description || null,
      photos: Array.isArray(p.photos) ? (p.photos as unknown[]) : p.photos ? [p.photos] : [],
      coverPhoto:
        p.cover_photo ||
        (Array.isArray(p.photos) && p.photos.length > 0 ? (p.photos as unknown[])[0] : null),
      tags: Array.isArray(p.tags) ? (p.tags as unknown[]) : [],
      amenities: Array.isArray(p.amenities) ? (p.amenities as unknown[]) : [],
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    // Fallback (MedHome / StaysNet): some orgs store listings in `anuncios_ultimate` (JSONB), not in `properties`.
    // Note: we also fallback when `properties` exists but appears incomplete (e.g., pricing all zeros),
    // because some orgs have a single "admin/test" property row that would otherwise hide real listings.
    const shouldLoadAnunciosFallback =
      formatted.length === 0 ||
      formatted.every((p) => (p?.pricing?.dailyRate || 0) <= 0);

    if (shouldLoadAnunciosFallback) {
      const { data: anuncios, error: anunciosError } = await supabase
        .from("anuncios_ultimate")
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

      const anuncioFormatted = (anuncios as any[] | null | undefined || []).map((row) => {
        const d = (row as any)?.data || {};
        const { photos, coverPhoto } = normalizeAnuncioPhotos(d);
        const pricing = normalizePricing(d);
        const derivedMaxGuests = computeMaxGuestsFromAnuncioData(d);
        const explicitMaxGuests = numberOrZero(d.guests ?? d.maxGuests ?? d.max_guests ?? d.hospedes ?? 0);
        const maxGuests = Math.max(explicitMaxGuests, derivedMaxGuests);

        return {
          id: row.id,
          name: d.title || d.name || d.internalId || "Imóvel",
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

      const seen = new Set(formatted.map((p) => p.id));
      const merged = [...formatted];
      for (const a of anuncioFormatted) {
        if (a?.id && !seen.has(a.id)) {
          merged.push(a);
          seen.add(a.id);
        }
      }

      return c.json(
        { success: true, data: merged, total: merged.length },
        200,
        withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
      );
    }

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
// PUBLIC (PROTO/STUB): Availability + pricing per day (planned)
// GET /client-sites/api/:subdomain/properties/:propertyId/availability?from=YYYY-MM-DD&to=YYYY-MM-DD
// ============================================================
clientSites.get("/api/:subdomain/properties/:propertyId/availability", async (c: Context) => {
  return c.json(
    {
      success: false,
      error: "Endpoint planejado",
      details:
        "availability-pricing ainda não está implementado como contrato público. Use este stub apenas para prototipar UI.",
    },
    200,
    withCorsHeaders({ "Content-Type": "application/json; charset=utf-8" })
  );
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

const app = new Hono();
app.get("/health", (c: Context) =>
  c.json({ ok: true, service: "rendizy-public" }));

// In production, the function name is included in the pathname; support both.
app.route("/rendizy-public/client-sites", clientSites);
app.route("/client-sites", clientSites);

Deno.serve(app.fetch);
