# 🧭 MAPA DE VALIDAÇÃO — WhatsApp (Evolution) — 2025-12-24

Este arquivo é um **mapa prático** para validar (com testes reais) se o WhatsApp via Evolution está operacional no backend `rendizy-server`, e **qual prefixo de rota está ativo** em produção.

## ✅ Objetivo

1. Confirmar que o **token do app** (`X-Auth-Token`) está válido (`/auth/me` retorna 200).
2. Confirmar qual **contract/path** está respondendo (evitar “testar rota errada e achar que quebrou”).
3. Validar endpoints de **leitura** (sem efeitos colaterais): config + status.

## ⚠️ Pré-requisitos

- `SUPABASE_URL` apontando para o projeto (ex: `https://odcgnzfremrqnvtitpcc.supabase.co`).
- `SUPABASE_ANON_KEY` (ou `VITE_SUPABASE_ANON_KEY`) definido.
- `RENDIZY_TOKEN` (token do app) **válido**.

### Como pegar um token válido (RENDIZY_TOKEN)

- Abra o app (local ou produção), faça login.
- Rode no console do navegador o script [GET-TOKEN.js](/GET-TOKEN.js).
- Copie o valor de `rendizy-token` e exporte no PowerShell:

`$env:RENDIZY_TOKEN = "<cole-o-token-aqui>"`

Observação: o [token.txt](/token.txt) pode estar **expirado** (quando isso acontece, `/auth/me` retorna 401 `SESSION_NOT_FOUND`).

## 🧪 Script de validação (recomendado)

Use o script: [TEST-WHATSAPP-PROD_2025-12-24.ps1](TEST-WHATSAPP-PROD_2025-12-24.ps1)

Exemplo:

`$env:SUPABASE_URL = "https://odcgnzfremrqnvtitpcc.supabase.co"`

`$env:SUPABASE_ANON_KEY = "<sua-anon-key>"`

`$env:RENDIZY_TOKEN = "<seu-rendizy-token>"`

`./TEST-WHATSAPP-PROD_2025-12-24.ps1`

Se quiser incluir probes longos (ex.: StaysNet modular pode demorar):

`./TEST-WHATSAPP-PROD_2025-12-24.ps1 -IncludeLong`

## ✅ Como interpretar os resultados

- **200 em `/auth/me`**: token válido; pode seguir para endpoints do WhatsApp.
- **401 em `/auth/me`**: token expirado/ inválido; gere outro token no navegador.
- **404 em `/chat/...` ou `/whatsapp/...`**: rota não está montada nesse prefixo.
  - Isso normalmente significa **(a)** deploy divergente, **(b)** path errado, ou **(c)** entrypoint `index.ts` em produção diferente do esperado.
- **504 em import StaysNet**: pode ser tempo de execução (gateway timeout) ou instabilidade momentânea.

## 📌 Paths esperados (segundo o entrypoint atual do repo)

No entrypoint local [supabase/functions/rendizy-server/index.ts](/supabase/functions/rendizy-server/index.ts):

- Health: `GET /health`
- Chat (novas):
  - `GET /channels/config` montado em `app.route("/chat", chatApp)` → portanto `GET /chat/channels/config`
  - compat: `GET /rendizy-server/chat/channels/config`
- WhatsApp legado (contrato):
  - `GET /rendizy-server/make-server-67caf26a/whatsapp/status`
  - aliases: `/whatsapp/*` e `/rendizy-server/whatsapp/*` são reescritos para o prefixo legado.

Importante: se em produção o comportamento não bate com isso (ex.: 404), o script varre múltiplas variações para descobrir **qual delas está ativa**.

## 📚 Docs de “vitória” e decisões já registradas

- [Rendizyoficial-main/VITORIA_WHATSAPP_E_LOGIN.md](Rendizyoficial-main/VITORIA_WHATSAPP_E_LOGIN.md) — registro explícito de WhatsApp conectado/online.
- [Rendizyoficial-main/WHATSAPP_VENCIDO_CONSOLIDADO.md](Rendizyoficial-main/WHATSAPP_VENCIDO_CONSOLIDADO.md) — consolidado (persistência + polling + `X-Auth-Token`).
- [Rendizyoficial-main/VERIFICACAO_ROTAS_WHATSAPP.md](Rendizyoficial-main/VERIFICACAO_ROTAS_WHATSAPP.md) — mapa de rotas novas vs legado.
- [Rendizyoficial-main/CORRECAO_URL_WEBHOOK_FINAL.md](Rendizyoficial-main/CORRECAO_URL_WEBHOOK_FINAL.md) — URL correta do webhook.
- [Rendizyoficial-main/CORRECAO_METODO_HTTP_FINDCHATS.md](Rendizyoficial-main/CORRECAO_METODO_HTTP_FINDCHATS.md) — correção crítica: `findChats` via **POST**.

## 🔒 Boas práticas de teste (para não “quebrar” sem querer)

- Prefira testar **status/config** antes de qualquer coisa.
- Evite `connect`/`disconnect` durante diagnóstico (podem apagar instância e forçar novo QR).
- Se precisar testar webhook, faça isso conscientemente (o webhook recebe eventos e pode persistir mensagens).

## 🧯 Se continuar 404 em tudo de WhatsApp/Chat

1. Confirme que você está chamando a função certa: `.../functions/v1/rendizy-server/...`
2. Rode o script de varredura e anote qual path (se algum) responde 200/401.
3. Compare com o entrypoint do repo: [supabase/functions/rendizy-server/index.ts](/supabase/functions/rendizy-server/index.ts).
4. Se o contract em produção estiver diferente, a correção típica é: redeploy do `rendizy-server` a partir do diretório certo (onde está esse `index.ts`).

---

**Última atualização:** 2025-12-24
