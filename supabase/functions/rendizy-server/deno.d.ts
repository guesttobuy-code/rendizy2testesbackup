/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

// Nota: este arquivo existe apenas para referenciar os tipos do Edge Runtime.
// Não declare novamente `Deno.env` aqui: o Edge Runtime já exporta `Deno.env` e
// isso causa conflito (TS2451) durante `deno check`.
