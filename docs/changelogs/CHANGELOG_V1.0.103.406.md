# CHANGELOG v1.0.103.406

> Nota (atual): o sistema de anúncios usa **tabela única** `anuncios_ultimate`.
> Qualquer menção a "tabela de drafts" abaixo deve ser considerada **legado/histórico**.

## Backend / Supabase Edge (rendizy-server)
- Habilitado `deno.json` com `nodeModulesDir:auto` e `deno check` passando no entrypoint minimal.
- `getSupabaseClient` agora aceita contexto opcional; KV Store ganhou generics para `get/mget/getByPrefix`.
- Rotas de blocks unificadas com tipo compartilhado (camelCase), cálculo de `nights` e suporte a `subtype: "reservation"`.
- Handler `/calendar/blocks` reativado via `getBlocks`; `routes-auth` garante token string ao ler Authorization.
- Reservas/guests: fallback seguro de `organization_id`, DTOs atualizados (`propertyId`, `guestName`), mapeamento de propriedades sem campo `name`.
- Ajuste em `utils-session` para await/try-catch (sem `.catch` em PromiseLike) e metadados de usuário corrigidos em `utils-get-organization-id`.

## Status
- `deno check --config supabase/functions/rendizy-server/deno.json supabase/functions/rendizy-server/index.ts` OK.

## Manutencao / Limpeza
- Removido `.env.local` com credenciais expostas e placeholder vazio `supabase/.env` do workspace.
- Apagados logs locais `tmp_vite_dev.log` e `vite-dev.log` para reduzir ruido.
- Criado `_archive/untracked-docs` e movidos arquivos `.md/.txt/.log` nao rastreados para nao poluir commits futuros.
- Ajustado fetch dos anúncios/immóveis para sempre enviar `Authorization: Bearer <anon>` + `apikey` (funções Supabase exigem header de auth), incluindo hooks e telas (lista, reservas, calendar).
- (Legado) Foi experimentado fallback direto ao REST quando a função `anuncios-ultimate/lista` retornava vazia, para destravar ambientes antigos.
	- Atual: **não** usar fallback REST para anúncios no app; a tabela canônica é `anuncios_ultimate` e o acesso deve ser via Edge com tenancy.
