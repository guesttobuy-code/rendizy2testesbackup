# FIX 401 (Supabase) + "Invalid JWT" — 2025-12-24

## Sintoma
- Frontend recebendo `401` em:
  - `.../functions/v1/rendizy-server/*` (ex.: `properties/lista`, `guests`, `reservations`, `calendar`)
  - `.../rest/v1/*` (ex.: `properties?select=*`)
- Login falhando com mensagem do app sobre `VITE_SUPABASE_ANON_KEY`.

## Causa raiz (encontrada no workspace)
- O arquivo `.env.local` do frontend estava com placeholders:
  - `VITE_SUPABASE_ANON_KEY=<SUPABASE_ANON_KEY>`
  - `SUPABASE_SERVICE_ROLE_KEY=<SUPABASE_SERVICE_ROLE_KEY>`
- Com isso, o browser envia headers inválidos (apikey/Authorization) e o gateway do Supabase responde `401`.

## Correções aplicadas no código
- Centralizado o uso da anon key (`publicAnonKey`) e `projectId`.
- `publicAnonKey` agora:
  - faz `trim()`
  - remove prefixo acidental `Bearer `
  - detecta placeholder do tipo `<...>` e avisa
  - suporta env alternativa (`VITE_SUPABASE_PUBLIC_ANON_KEY`, `VITE_SUPABASE_KEY`) além de `VITE_SUPABASE_ANON_KEY`.
- `authService` agora valida melhor a anon key:
  - bloqueia placeholder
  - detecta e bloqueia `service_role` no frontend (inseguro)
  - orienta quando não parece JWT (`aaa.bbb.ccc`).
- Alguns pontos do app que liam `import.meta.env.VITE_SUPABASE_ANON_KEY` diretamente foram trocados para usar `publicAnonKey`.

## O que você precisa configurar (sem terminal)
1. Abra `.env.local` no frontend e substitua:
   - `VITE_SUPABASE_ANON_KEY=<SUPABASE_ANON_KEY>`
   por
   - `VITE_SUPABASE_ANON_KEY=<<anon public key real do Supabase>>`
2. A anon public key fica em:
   - Supabase Dashboard → Settings → API → `anon public key`
3. **Nunca** coloque `service_role` em variável `VITE_*` (frontend).

## Observação importante
- `SUPABASE_SERVICE_ROLE_KEY` é para backend/Edge Functions (secrets do Supabase) e não resolve 401 do browser se o `VITE_SUPABASE_ANON_KEY` estiver vazio/placeholder.
