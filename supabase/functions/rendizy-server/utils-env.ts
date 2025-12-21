const firstDefined = (keys: string[], fallback?: string) => {
  try {
    for (const key of keys) {
      const value = Deno.env.get(key);
      if (value && value.trim().length > 0) {
        return value.trim();
      }
    }
    return fallback || "";
  } catch (error) {
    console.error(`[utils-env] Error reading env vars for keys ${keys}:`, error);
    return fallback || "";
  }
};

export const SUPABASE_URL = firstDefined(
  ["RENDIZY_SUPABASE_URL", "LOCAL_SUPABASE_URL", "SUPABASE_URL"],
  "http://127.0.0.1:54321"
);

export const SUPABASE_SERVICE_ROLE_KEY = firstDefined(
  ["SERVICE_ROLE_KEY", "PRIVATE_SERVICE_ROLE_KEY", "RENDIZY_SERVICE_ROLE_KEY", "LOCAL_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
  ""
);

export const SUPABASE_ANON_KEY = firstDefined(
  [
    "RENDIZY_SUPABASE_ANON_KEY",
    "LOCAL_ANON_KEY",
    "SUPABASE_ANON_KEY",
    "SUPABASE_KEY",
  ],
  ""
);

export const SUPABASE_PROJECT_REF = firstDefined(
  ["RENDIZY_PROJECT_REF", "LOCAL_PROJECT_REF", "SUPABASE_PROJECT_ID", "SUPABASE_PROJECT_REF"],
  "Rendizy2producao"
);

export const ENV_HELPERS = {
  firstDefined,
};

// ✅ Log para debug (apenas no primeiro acesso)
console.log("[utils-env] Environment loaded:");
console.log("[utils-env] SUPABASE_URL:", SUPABASE_URL ? "SET" : "NOT SET");
console.log("[utils-env] SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_SERVICE_ROLE_KEY ? "SET" : "NOT SET");
console.log("[utils-env] SUPABASE_ANON_KEY:", SUPABASE_ANON_KEY ? "SET" : "NOT SET");
console.log("[utils-env] SUPABASE_PROJECT_REF:", SUPABASE_PROJECT_REF);
