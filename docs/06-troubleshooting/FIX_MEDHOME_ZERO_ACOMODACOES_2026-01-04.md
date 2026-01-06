# FIX: MedHome mostrando 0 acomodações (básico não carregava)

**Data**: 2026-01-04  
**Ambiente**: Vercel `/site/medhome` + Supabase project `odcgnzfremrqnvtitpcc`

## Sintomas

- Página carregava, mas listagem mostrava **“0 acomodações encontradas”**.
- Em alguns momentos, a página nem abria (erro upstream / `Object not found`).
- Quando abriu, preço exibiu `R$ NaN` em pelo menos um card.

## Diagnóstico (o que realmente estava acontecendo)

1) **Redirect do site para Storage estava quebrado**
- `rendizy-public/client-sites/serve/medhome` redirecionava para `.../extracted/dist/index.html`.
- Esse objeto **não existia** no Storage, gerando `404 Object not found`.
- Porém existia `.../public-sites/medhome/index.html`.

2) **API pública de imóveis retornava vazio**
- `GET /client-sites/api/medhome/properties` voltava `{ success: true, data: [], total: 0 }`.
- A org tinha `properties` (mas `status=draft`, filtrado fora por design).
- A org também tinha `properties` ativo (mas o fallback só existia no código local, ainda não deployado / ou o deploy não estava realmente válido).

3) **Deploy do Edge Function falhava silenciosamente (bundle quebrado)**
- `rendizy-public` usava imports incompatíveis com Deno/Supabase Edge (`hono`, `jszip`, `@supabase/supabase-js`).
- O Supabase CLI retornava erro de bundling.

4) **Frontend filtrava por `pricing.dailyRate`**
- O bundle MedHome esperava `pricing.dailyRate`.
- O normalizador gerava apenas `pricing.basePrice`.
- Resultado: imóveis “sumiam” no filtro da UI.

## Correções aplicadas

- Proxy Vercel: fallback automático de Storage `extracted/dist/index.html` → `public-sites/<sub>/index.html` quando receber `Object not found`.
- Edge Function `rendizy-public`:
  - fallback `properties` → `properties` quando a lista vier vazia;
  - imports corrigidos para Deno (`npm:`).
- Proxy Vercel: patch in-flight do bundle JS para derivar `pricing.dailyRate` a partir de `basePrice`.

## Como validar (rápido)

- Página: `https://rendizy2testesbackup.vercel.app/site/medhome/`
- API: `https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-public/client-sites/api/medhome/properties`

Esperado:
- Página mostra pelo menos 1 acomodação.
- Endpoint retorna `total > 0`.

## Próximos ajustes (consequência)

- Preço `R$ NaN`: significa que o site ainda não recebe valor numérico consistente (corrigir mapeamento/shape de pricing).
- Fotos/capa: mapear campos corretos do `properties.data` para `photos`/`coverPhoto`.
- Regras de filtros/ocupação: revisar com o produto.

## Referência de arquitetura

- [docs/02-architecture/ARQUITETURA_CLIENT_SITES_PROXY_SUPABASE_MEDHOME_2026-01-04.md](../02-architecture/ARQUITETURA_CLIENT_SITES_PROXY_SUPABASE_MEDHOME_2026-01-04.md)
