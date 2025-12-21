# CHANGELOG v1.0.103.407

## Backend / Supabase Edge (rendizy-server)
- Registradas todas as rotas StaysNet (settings, test, imports) no entrypoint para garantir persistência e evitar resposta padrão "Edge Function funcionando".
- Deploy executado via `npx supabase@latest functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc`, liberando GET/POST de config e imports no ambiente.

## Frontend / StaysNet
- `StaysNetService` documentado sobre uso obrigatório de `Authorization: Bearer <anon>` + `apikey` + `X-Auth-Token`, prevenindo remoção acidental dos headers que destravam as rotas privadas do Edge.

## DX / Scripts
- `npm run dev` na raiz agora delega para `Rendizyoficial-main`, evitando erros de diretório incorreto.
- `scripts/guardian.js` convertido para ESM para manter o pré-check das variáveis `.env.local` antes de subir o Vite.

## Como testar
- Na raiz: `npm run dev` (Guardian valida `.env.local` e sobe Vite em 3000).
- No app: salvar credenciais StaysNet e confirmar que o GET retorna dados persistidos; rodar importação para verificar propriedades/reservas/guests carregando.
