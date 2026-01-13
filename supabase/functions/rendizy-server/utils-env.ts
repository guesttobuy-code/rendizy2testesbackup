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

// Stays.net
// Preferência: config por organização no banco (`staysnet_config`).
// Estas envs são apenas fallback/bootstrapping e para jobs técnicos.
export const STAYSNET_BASE_URL = firstDefined(
  ["STAYSNET_BASE_URL", "RENDIZY_STAYSNET_BASE_URL"],
  "https://bvm.stays.net/external/v1"
);

export const STAYSNET_API_KEY = firstDefined(
  ["STAYSNET_API_KEY", "RENDIZY_STAYSNET_API_KEY"],
  ""
);

export const STAYSNET_API_SECRET = firstDefined(
  ["STAYSNET_API_SECRET", "RENDIZY_STAYSNET_API_SECRET"],
  ""
);

// Stays.net webhooks
// Observação: a doc menciona `x-stays-signature` mas o algoritmo pode variar.
// Estes envs habilitam verificação opcional (default: desligado).
export const STAYSNET_WEBHOOK_SECRET = firstDefined(
  ["STAYSNET_WEBHOOK_SECRET", "RENDIZY_STAYSNET_WEBHOOK_SECRET"],
  ""
);

export const STAYSNET_WEBHOOK_VERIFY_SIGNATURE = firstDefined(
  ["STAYSNET_WEBHOOK_VERIFY_SIGNATURE", "RENDIZY_STAYSNET_WEBHOOK_VERIFY_SIGNATURE"],
  "false"
);

// Vercel Deployments API (para build automático de sites)
// Obter token em: https://vercel.com/account/tokens
export const VERCEL_ACCESS_TOKEN = firstDefined(
  ["VERCEL_ACCESS_TOKEN", "RENDIZY_VERCEL_ACCESS_TOKEN"],
  ""
);

// Team ID da Vercel (opcional, para projetos de equipe)
export const VERCEL_TEAM_ID = firstDefined(
  ["VERCEL_TEAM_ID", "RENDIZY_VERCEL_TEAM_ID"],
  ""
);

// Project ID do projeto de sites clientes na Vercel
export const VERCEL_PROJECT_ID = firstDefined(
  ["VERCEL_PROJECT_ID", "RENDIZY_VERCEL_PROJECT_ID"],
  ""
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
console.log("[utils-env] STAYSNET_BASE_URL:", STAYSNET_BASE_URL ? "SET" : "NOT SET");
console.log("[utils-env] STAYSNET_API_KEY:", STAYSNET_API_KEY ? "SET" : "NOT SET");
console.log("[utils-env] STAYSNET_API_SECRET:", STAYSNET_API_SECRET ? "SET" : "NOT SET");
console.log("[utils-env] STAYSNET_WEBHOOK_SECRET:", STAYSNET_WEBHOOK_SECRET ? "SET" : "NOT SET");
console.log(
  "[utils-env] STAYSNET_WEBHOOK_VERIFY_SIGNATURE:",
  STAYSNET_WEBHOOK_VERIFY_SIGNATURE ? String(STAYSNET_WEBHOOK_VERIFY_SIGNATURE).trim() : "(default)"
);
