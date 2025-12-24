# CHANGELOG v1.0.103.407

## Backend / Supabase Edge (rendizy-server)
- Registradas todas as rotas StaysNet (settings, test, imports) no entrypoint para garantir persistência e evitar resposta padrão "Edge Function funcionando".
- Deploy executado via `npx supabase@latest functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc`, liberando GET/POST de config e imports no ambiente.
- Novo `/staysnet/import/preview` cruza `stays_net_id` dos anúncios existentes (anuncios_drafts) com a lista vinda da Stays e retorna totais (remotos, existentes, novos) para evitar duplicação.
- Corrigidas rotas de `/reservations` para aplicar `tenancyMiddleware`, evitando erro 500 (TenantContext ausente) e permitindo a listagem no frontend.
- Segurança: removida rota/local reimport e referência a arquivo não versionado, prevenindo risco de credenciais hardcoded.

## Frontend / StaysNet
- `StaysNetService` documentado sobre uso obrigatório de `Authorization: Bearer <anon>` + `apikey` + `X-Auth-Token`, prevenindo remoção acidental dos headers que destravam as rotas privadas do Edge.
- Fluxo de importação agora mostra preview (totais novos vs existentes) e oferece ações: importar só novos ou atualizar existentes + novos, sempre respeitando o ID mestre `stays_net_id`.

## DX / Scripts
- `npm run dev` na raiz agora delega para `Rendizyoficial-main`, evitando erros de diretório incorreto.
- `scripts/guardian.js` convertido para ESM para manter o pré-check das variáveis `.env.local` antes de subir o Vite.

## Como testar
- Na raiz: `npm run dev` (Guardian valida `.env.local` e sobe Vite em 3000).
- No app: salvar credenciais StaysNet e confirmar que o GET retorna dados persistidos; rodar importação para verificar propriedades/reservas/guests carregando.
- Para testar `/reservations` manualmente: `Authorization: Bearer <anonKey>` + `X-Auth-Token: <sessionToken>`.
