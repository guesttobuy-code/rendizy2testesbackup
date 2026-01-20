# Desafios críticos - 03/12/2025

Objetivo do dia: estabilizar o fluxo de login com arquitetura isolada e fácil de manter.

## Decisões
- Login é uma cápsula: `services/authService.ts` + `contexts/AuthContext.tsx` + `components/ProtectedRoute.tsx`.
- Serviço de autenticação retorna formato único `{ success, token, user, error? }`.
- Contexto não depende de timers ocultos: carrega token, busca usuário e controla sessão em um só lugar.
- ProtectedRoute minimalista: só checa `isAuthenticated` e exibe loader enquanto valida.

## O que foi implementado
1. `RendizyPrincipal/services/authService.ts`
   - Normalização de login/refresh/me, usando `AUTH_TOKEN_KEY`.
   - Armazena o token apenas quando o backend confirma sucesso; limpa token em erros.
2. `RendizyPrincipal/contexts/AuthContext.tsx`
   - Provider leve: carrega token salvo, chama `/auth/me`, mantém `user`, `token`, `isAuthenticated`, `isLoading`.
   - `login` grava token, define usuário; `logout` limpa tudo; `refreshUser` revalida sessão.
3. `RendizyPrincipal/components/ProtectedRoute.tsx`
   - Lógica reduzida: loader durante `isLoading`; rotas públicas liberadas; redirect simples quando não autenticado.

## Próximos passos sugeridos
- Confirmar fluxo de login end-to-end com backend local (Edge Function) e com backend remoto.
- Revisar componentes que usam `useAuth` para alinhar com o shape atual de `user` (id/username/type/opcional).
- Garantir que a página de login trata mensagens simples vindas do service (`error`).
- Se precisar multi-org, adicionar `organization` no contexto quando `/auth/me` devolver.

## Como rodar (referência rápida)
- Backend local (Edge Function):  
  `.\tools\supabase.exe functions serve rendizy-server --no-verify-jwt --env-file supabase/functions/.env --import-map supabase/functions/deno.json`
- Frontend:  
  `npm run dev` (Vite escolhe a porta livre, ex: 3000/3001/3002).
- Smoke de auth local:  
  `.\scripts\smoke-local-auth.ps1` (login admin/admin e `/auth/me`).

## Login estabilizado (LOCAL_MODE)
- `.env` com `LOCAL_MODE=true` ativa o short-circuit da rota `/auth/me`.
- Em `supabase/functions/rendizy-server/index.ts`, o `/auth/me` devolve usuário fake (`local-admin`) quando `LOCAL_MODE=true`, sem bater em banco/kv.
- Em `supabase/functions/rendizy-server/routes-auth.ts`, o `/auth/me` segue a mesma lógica: bypass local retorna admin fake; fora do modo local valida token via `getSessionFromToken` e busca user/org no banco.
- Testes via terminal:
  - `POST http://127.0.0.1:54321/functions/v1/rendizy-server/auth/login` com `{"username":"admin","password":"admin"}` → token.
  - `GET  http://127.0.0.1:54321/functions/v1/rendizy-server/auth/me` com `Authorization: Bearer <token>` → `success:true` e user `local-admin`.
- Front em `http://localhost:3002` mantém sessão mesmo após refresh.
- Se a porta mudar, abrir a que o Vite mostrar no console.

## Contratos mínimos por cápsula
- Auth: `/auth/login` -> `{success, data:{token, refresh_token?, user}}`; `/auth/me` -> `{success, user}`; header `Authorization: Bearer <token>`.
- Properties: GET `/properties` requer bearer; 401 -> logout ou re-login, sem cache local.
- Reservations: GET `/reservations` idem; banner de erro quando backend falha.
- Calendar: GET `/calendar` com start/end/flags; não gravar nada se backend falhar.
- Guests: GET `/guests` idem; fallback mock apenas se modo fallback estiver ativo.
- WhatsApp contatos/chats: usar bearer; se offline, registrar log mas manter login vivo.
