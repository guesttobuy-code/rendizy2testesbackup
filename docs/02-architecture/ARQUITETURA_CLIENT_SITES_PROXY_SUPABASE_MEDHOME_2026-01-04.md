# ARQUITETURA: Client Sites (Supabase Storage + Vercel Proxy) — caso MedHome

**Data**: 2026-01-04  
**Contexto**: `rendizy2testesbackup.vercel.app/site/medhome/`

Este documento registra a arquitetura real em produção/staging para **sites públicos por subdomínio** (ex.: `medhome`) e as correções aplicadas para fazer o “básico funcionar” após um ciclo de debugging.

---

## 1) Objetivo

Servir um SPA (site do cliente) hospedado no Supabase Storage, com:

- `Content-Type` correto (HTML/JS/CSS), evitando `text/plain`.
- CSP viável (sem `sandbox` que quebra módulos/SPA).
- Rotas e assets funcionando sob subpath `/site/<subdomain>/...`.
- API pública de imóveis para alimentar o site.

---

## 2) Componentes

### 2.1 Vercel (proxy)

- Endpoint: `/site/<subdomain>` e `/site/<subdomain>/<assetPath>`
- Implementação: [api/site.js](../../api/site.js)

Responsabilidades:
- Buscar o `index.html` do site (via Edge Function `rendizy-public`, que redireciona para Storage).
- Reescrever HTML para suportar subpath (`<base href="/site/<subdomain>/">`).
- Proxy de assets (JS/CSS/imagens/fonts) com `Content-Type` correto.
- Aplicar patches cirúrgicos quando o bundle compilado do site não bate com o shape do backend (ver §4.3).

### 2.2 Supabase Edge Function (público)

- Função: `rendizy-public`
- Rotas:
  - `GET /client-sites/serve/:subdomain` → **302** para `index.html` no Storage
  - `GET /client-sites/api/:subdomain/properties` → JSON com imóveis (público)
- Implementação: [supabase/functions/rendizy-public/index.ts](../../supabase/functions/rendizy-public/index.ts)

### 2.3 Supabase Storage

- Bucket: `client-sites`
- Estruturas observadas:
  - `client-sites/<orgId>/public-sites/<subdomain>/index.html` (existente)
  - `client-sites/<orgId>/extracted/dist/index.html` (em alguns ambientes **não existe**)

### 2.4 Banco / Dados

- `client_sites`: configura subdomain + organização + referência de onde o site está no Storage (`archive_path`, `extracted_base_url`, etc.).
- `properties`: imóveis “clássicos” (muitas vezes vazia ou status não-publicado em ambientes de testes).
- `anuncios_ultimate`: imóveis importados/centralizados (ex.: StaysNet) usados como **fallback**.

---

## 3) Fluxos

### 3.1 Servir o site

```
Browser
  └─ GET https://<vercel>/site/<sub>
       └─ Vercel api/site.js
            ├─ GET https://<supabase>/functions/v1/rendizy-public/client-sites/serve/<sub>
            │    └─ 302 Location: https://<supabase>/storage/v1/object/public/client-sites/<orgId>/.../index.html
            ├─ GET (follow) index.html no Storage
            ├─ Ajusta HTML: <base href="/site/<sub>/">
            └─ Responde HTML com CSP + content-type
```

### 3.2 Buscar imóveis

```
Browser
  └─ GET https://<supabase>/functions/v1/rendizy-public/client-sites/api/<sub>/properties
       ├─ Busca organization_id em client_sites
       ├─ Tenta properties (status active/published)
       └─ Se vazio: fallback anuncios_ultimate (status active/published)
```

---

## 4) Causas-raiz que bloqueavam o básico

### 4.1 Redirect do "serve" apontava para caminho inexistente

O endpoint `/client-sites/serve/<sub>` redirecionava para:

- `.../client-sites/<orgId>/extracted/dist/index.html` (404: `Object not found`)

Mas o Storage tinha:

- `.../client-sites/<orgId>/public-sites/<subdomain>/index.html` (200)

Correção aplicada no proxy Vercel: se o `index.html` do redirect vier 404 com `Object not found`, tentar automaticamente o caminho `public-sites/<subdomain>/index.html`.

### 4.2 Edge Function não deployava por imports incompatíveis

O `rendizy-public` estava com imports no estilo Node/TS:

- `hono`, `jszip`, `@supabase/supabase-js`

No ambiente Deno/Supabase Edge, isso quebra o bundle. Ajuste feito:

- `npm:hono`, `npm:jszip`, `npm:@supabase/supabase-js`

Com isso, o deploy passou a funcionar e o endpoint público de properties começou a responder com dados.

### 4.3 UI filtrava imóveis por `pricing.dailyRate`, mas o dado vinha como `basePrice`

No bundle compilado do MedHome, a UI espera `property.pricing.dailyRate`. O normalizador do bundle produzia apenas `pricing.basePrice`.

Correção aplicada no proxy Vercel (patch in-flight do JS compilado): derivar `dailyRate` a partir de `basePrice`.

Observação importante:
- Isso é um workaround de compatibilidade com bundle legado/compilado. A solução “limpa” é alinhar o shape no backend ou rebuild do site.

### 4.4 Capacidade (hóspedes) vinha como 0 apesar das camas indicarem 3

No caso MedHome, o anúncio tinha inventário de camas em `anuncios_ultimate.data.rooms[].beds` (ex.: casal + solteiro), mas o site recebia `maxGuests=0`.

Correções aplicadas:

- Backend (`rendizy-public`) passa a **derivar `maxGuests` a partir das camas** e publicar em `capacity.maxGuests` no DTO.
- Backfill no `anuncios_ultimate.data` para persistir `guests/maxGuests/max_guests` (para que a fonte já fique canônica).

---

## 5) Verificações rápidas (smoke tests)

### 5.1 Site

- `https://rendizy2testesbackup.vercel.app/site/medhome/`

### 5.2 API pública (imóveis)

- `https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-public/client-sites/api/medhome/properties`

Esperado:
- `{"success":true,"data":[...],"total":N}`

### 5.3 Storage (index.html)

- `.../storage/v1/object/public/client-sites/<orgId>/public-sites/medhome/index.html`

---

## 6) Próximos passos (ajustes esperados)

Após o “básico funcionar”, os próximos ajustes típicos para qualidade do catálogo:

- Preço: garantir que o dado real de diária está presente (hoje pode vir `0` e o site pode mostrar `NaN` se tentar formatar `undefined`/string inválida).
- Fotos: mapear `photos`/`coverPhoto` com os campos reais do `anuncios_ultimate.data`.
- Capacidade: bedrooms/maxGuests/bathrooms conforme origem.
- Status/ocupação: ajustar regras de “ocupado” vs disponibilidade.

---

## 7) Arquivos envolvidos (referência)

- [api/site.js](../../api/site.js)
- [supabase/functions/rendizy-public/index.ts](../../supabase/functions/rendizy-public/index.ts)
- [scripts/deploy-rendizy-public.ps1](../../scripts/deploy-rendizy-public.ps1)
- [scripts/backfill-anuncios-ultimate-capacity.ps1](../../scripts/backfill-anuncios-ultimate-capacity.ps1)
