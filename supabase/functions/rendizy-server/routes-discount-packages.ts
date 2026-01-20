import { getSupabaseClient } from "./kv_store.tsx";

type MinimalRouter = {
  get: (path: string, handler: (c: MinimalContext) => Response | Promise<Response>) => void;
  put: (path: string, handler: (c: MinimalContext) => Response | Promise<Response>) => void;
};

type MinimalContext = {
  req: {
    param: (name: string) => string;
    header: (name: string) => string | undefined;
    json: () => Promise<unknown>;
  };
  json: (payload: unknown, status?: number) => Response;
};

type DiscountPackagePreset = "weekly" | "monthly" | "custom";

type DiscountPackageRule = {
  id: string;
  preset: DiscountPackagePreset;
  min_nights: number;
  discount_percent: number;
};

type DiscountPackagesSettings = {
  rules: DiscountPackageRule[];
};

const DEFAULT_SETTINGS: DiscountPackagesSettings = {
  rules: [
    { id: "weekly", preset: "weekly", min_nights: 7, discount_percent: 2 },
    { id: "custom_15", preset: "custom", min_nights: 15, discount_percent: 4 },
    { id: "monthly", preset: "monthly", min_nights: 28, discount_percent: 12 },
  ],
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  cookieHeader.split(";").forEach((cookie) => {
    const [key, value] = cookie.trim().split("=");
    if (key && value) {
      cookies[key] = decodeURIComponent(value);
    }
  });
  return cookies;
}

function extractToken(c: MinimalContext): string | undefined {
  const customToken = c.req.header("X-Auth-Token");
  if (customToken) return customToken;

  const cookieHeader = c.req.header("Cookie") || "";
  const cookies = parseCookies(cookieHeader);
  const tokenFromCookie = cookies["rendizy-token"];
  if (tokenFromCookie) return tokenFromCookie;

  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return undefined;
  return authHeader.split(" ")[1];
}

async function getOrganizationIdFromSessionOrThrow(c: MinimalContext): Promise<string> {
  const token = extractToken(c);
  if (!token) {
    throw new Error("Unauthorized: token ausente");
  }

  const client = getSupabaseClient();

  const { data: sessionByAccessToken, error: errorAccessToken } = await client
    .from("sessions")
    .select("organization_id, expires_at")
    .eq("access_token", token)
    .maybeSingle();

  if (!errorAccessToken && sessionByAccessToken?.organization_id) {
    const expiresAt = sessionByAccessToken.expires_at ? Date.parse(String(sessionByAccessToken.expires_at)) : NaN;
    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
      throw new Error("Unauthorized: sessão expirada");
    }
    return String(sessionByAccessToken.organization_id);
  }

  const { data: sessionByToken, error: errorToken } = await client
    .from("sessions")
    .select("organization_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!errorToken && sessionByToken?.organization_id) {
    const expiresAt = sessionByToken.expires_at ? Date.parse(String(sessionByToken.expires_at)) : NaN;
    if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) {
      throw new Error("Unauthorized: sessão expirada");
    }
    return String(sessionByToken.organization_id);
  }

  throw new Error("Unauthorized: sessão não encontrada");
}

function coercePreset(v: unknown): DiscountPackagePreset | null {
  if (v === "weekly" || v === "monthly" || v === "custom") return v;
  return null;
}

function clampDiscountPercent(v: number): number {
  if (!Number.isFinite(v) || v < 0) return 0;
  if (v > 100) return 100;
  return v;
}

function normalizeSettings(input: unknown): DiscountPackagesSettings {
  const obj = isRecord(input) ? input : {};
  const rulesRaw = Array.isArray(obj.rules) ? obj.rules : [];

  const byPreset: Partial<Record<"weekly" | "monthly", DiscountPackageRule>> = {};
  const customs: DiscountPackageRule[] = [];

  for (const r of rulesRaw) {
    if (!isRecord(r)) continue;
    const preset = coercePreset(r.preset);
    if (!preset) continue;

    const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : crypto.randomUUID();
    const rawMin = Number(r.min_nights);
    const min_nights = preset === "weekly"
      ? 7
      : preset === "monthly"
        ? 28
        : Number.isFinite(rawMin) && rawMin > 0
          ? Math.max(1, Math.round(rawMin))
          : 1;

    const discount_percent = clampDiscountPercent(Number(r.discount_percent));

    const rule: DiscountPackageRule = { id, preset, min_nights, discount_percent };

    if (preset === "weekly" || preset === "monthly") {
      // Mantém apenas um (o primeiro) por preset
      if (!byPreset[preset]) byPreset[preset] = rule;
      continue;
    }

    customs.push(rule);
  }

  const weekly = byPreset.weekly ?? DEFAULT_SETTINGS.rules.find((x) => x.preset === "weekly")!;
  const monthly = byPreset.monthly ?? DEFAULT_SETTINGS.rules.find((x) => x.preset === "monthly")!;

  customs.sort((a, b) => a.min_nights - b.min_nights);

  return {
    rules: [weekly, ...customs, monthly],
  };
}

async function getOrgDiscountPackages(organizationId: string): Promise<DiscountPackagesSettings> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from("organizations")
    .select("metadata")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const metadata = isRecord(data) && isRecord(data.metadata) ? data.metadata : null;
  const settings = metadata && isRecord(metadata.discount_packages) ? metadata.discount_packages : DEFAULT_SETTINGS;
  return normalizeSettings(settings);
}

async function parseIncomingSettings(c: MinimalContext): Promise<DiscountPackagesSettings> {
  const body: unknown = await c.req.json();
  if (!isRecord(body)) return normalizeSettings(body);

  // Preferir { settings: { rules: [...] } } (padrão do frontend)
  const maybeSettings = isRecord(body.settings) ? body.settings : body;
  return normalizeSettings(maybeSettings);
}

async function setOrgDiscountPackages(organizationId: string, settings: DiscountPackagesSettings): Promise<DiscountPackagesSettings> {
  const client = getSupabaseClient();

  const { data: rpcData, error: rpcError } = await client.rpc("set_organization_discount_packages", {
    p_organization_id: organizationId,
    p_settings: settings,
  });

  if (!rpcError) {
    return normalizeSettings(rpcData ?? settings);
  }

  const msg = String(rpcError.message ?? "");
  const missingRpc = msg.includes("Could not find the function public.set_organization_discount_packages") ||
    msg.includes("set_organization_discount_packages") && msg.includes("schema cache");

  if (!missingRpc) {
    throw new Error(rpcError.message);
  }

  const { data: orgRow, error: readError } = await client
    .from("organizations")
    .select("metadata")
    .eq("id", organizationId)
    .maybeSingle();

  if (readError) throw new Error(readError.message);

  const currentMetadata = isRecord(orgRow) && isRecord(orgRow.metadata) ? orgRow.metadata : {};
  const nextMetadata = {
    ...currentMetadata,
    discount_packages: settings,
  };

  const { data: updatedRow, error: updateError } = await client
    .from("organizations")
    .update({ metadata: nextMetadata })
    .eq("id", organizationId)
    .select("metadata")
    .maybeSingle();

  if (updateError) throw new Error(updateError.message);

  const updatedMetadata = isRecord(updatedRow) && isRecord(updatedRow.metadata) ? updatedRow.metadata : null;
  const written = updatedMetadata && isRecord(updatedMetadata.discount_packages) ? updatedMetadata.discount_packages : settings;
  return normalizeSettings(written);
}

export function registerDiscountPackagesRoutes(app: MinimalRouter) {
  const getByOrg = async (c: MinimalContext) => {
    try {
      const orgId = await getOrganizationIdFromSessionOrThrow(c);
      const requestedId = c.req.param("id");
      if (requestedId && requestedId !== orgId) {
        return c.json({ success: false, error: "Forbidden" }, 403);
      }

      const settings = await getOrgDiscountPackages(orgId);
      return c.json({ success: true, settings });
    } catch (e: unknown) {
      console.error("[discount-packages] GET failed:", e);
      const message = e instanceof Error ? e.message : "Failed to load discount packages";
      const status = typeof message === "string" && message.startsWith("Unauthorized:") ? 401 : 500;
      return c.json({ success: false, error: message }, status);
    }
  };

  const putByOrg = async (c: MinimalContext) => {
    try {
      const orgId = await getOrganizationIdFromSessionOrThrow(c);
      const requestedId = c.req.param("id");
      if (requestedId && requestedId !== orgId) {
        return c.json({ success: false, error: "Forbidden" }, 403);
      }

      const next = await parseIncomingSettings(c);

      const saved = await setOrgDiscountPackages(orgId, next);
      return c.json({ success: true, settings: saved });
    } catch (e: unknown) {
      console.error("[discount-packages] PUT failed:", e);
      const message = e instanceof Error ? e.message : "Failed to save discount packages";
      const status = typeof message === "string" && message.startsWith("Unauthorized:") ? 401 : 500;
      return c.json({ success: false, error: message }, status);
    }
  };

  // GET/PUT /organizations/:id/discount-packages
  app.get("/organizations/:id/discount-packages", getByOrg);
  app.put("/organizations/:id/discount-packages", putByOrg);

  // Compat com prefixo /rendizy-server
  app.get("/rendizy-server/organizations/:id/discount-packages", getByOrg);
  app.put("/rendizy-server/organizations/:id/discount-packages", putByOrg);
}
