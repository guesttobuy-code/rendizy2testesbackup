# Multi-Tenancy (Canônico)

Este documento define as **regras canônicas** de isolamento multi-tenant no Rendizy.

Objetivo: garantir que **cada organização (`organization_id`) veja e modifique apenas seus próprios dados**.

---

## 1) Regra Mestre: como obter `organization_id`

**Backend (Edge Functions / Hono)**

- **Nunca** aceite `organization_id` vindo do body como fonte de verdade.
- **Sempre** derive o `organization_id` do contexto autenticado (token/sessão).
- Use o helper canônico:
  - `getOrganizationIdForRequest(c)` em `supabase/functions/rendizy-server/utils-multi-tenant.ts`

Regras:
- **Superadmin**: por padrão, usa sempre `RENDIZY_MASTER_ORG_ID`.
- **Usuário normal**: usa `organization_id` resolvido pela sessão/token (via `getOrganizationIdOrThrow`).

---

## 2) Autenticação: contrato de token (frontend → backend)

- O frontend deve enviar `X-Auth-Token: <rendizy-token>` (token armazenado pelo app).
- O backend resolve a sessão e aplica tenancy via `tenancyMiddleware`.

Notas:
- `Authorization: Bearer <anon key>` é usado para Supabase client-side, mas **não substitui** o token de sessão do Rendizy.

---

## 3) Regra Canônica: sempre filtrar por organização

Em **toda leitura (GET)** e **toda escrita (POST/PATCH/DELETE)**:

- Adicione `.eq('organization_id', organizationId)` na query.
- Nunca retorne registros que não pertencem ao `organization_id` da requisição.

Padrão recomendado:

1. `const organizationId = await getOrganizationIdForRequest(c)`
2. Query/Mutação no Supabase sempre com `.eq('organization_id', organizationId)`
3. Para endpoints por `:id`, valide `UUID` e aplique filtro de `organization_id`.

---

## 4) Tabelas canônicas por domínio

### 4.1) Anúncios (Imóveis)

- **Tabela canônica**: `public.properties`
- Endpoints canônicos:
  - `GET  /functions/v1/rendizy-server/anuncios-ultimate/lista`
  - `GET  /functions/v1/rendizy-server/anuncios-ultimate/:id`
  - `POST /functions/v1/rendizy-server/anuncios-ultimate/create`
  - `POST /functions/v1/rendizy-server/anuncios-ultimate/save-field`
  - `PATCH /functions/v1/rendizy-server/anuncios-ultimate/:id`
  - `DELETE /functions/v1/rendizy-server/anuncios-ultimate/:id`

Registros internos:
- Configurações internas do módulo podem ficar em `properties.data` com:
  - `data.__kind = 'settings'`
  - `data.__settings_key = 'locations_listings'`
- A rota `/lista` **deve excluir** registros de settings.

### 4.2) Reservas

- Tabela canônica: `public.reservations`
- Regra forte: reserva **não pode existir sem imóvel** válido.
- O filtro por `organization_id` deve ser aplicado em lista e detalhe.

### 4.3) Hóspedes

- Tabela canônica: `public.guests`
- O filtro por `organization_id` deve ser aplicado em lista e detalhe.

---

## 5) Anti-padrões (proibidos)

- Retornar dados sem filtro de `organization_id`.
- Confiar em `organization_id` fornecido pelo cliente (body/query) para usuários normais.
- Misturar tenants no mesmo endpoint (ex.: “listar tudo” sem org).
- Consultar tabelas legadas/erradas para anúncios (o sistema oficial é `properties`).

---

## 6) Checklist rápido (code review)

- [ ] Rota usa `tenancyMiddleware`.
- [ ] Rota calcula org via `getOrganizationIdForRequest(c)`.
- [ ] Query inclui `.eq('organization_id', organizationId)`.
- [ ] Endpoints por `:id` validam UUID e filtram por org.
- [ ] Anúncios usam `properties` e não retornam settings na lista.
