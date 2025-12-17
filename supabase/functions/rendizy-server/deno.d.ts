/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined;
  }
}

// Nota: removido o declare module "npm:*" para evitar resolução de pacote "*"
