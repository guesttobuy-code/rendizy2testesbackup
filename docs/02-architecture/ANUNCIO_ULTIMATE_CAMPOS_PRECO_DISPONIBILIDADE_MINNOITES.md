# ANÚNCIO ULTIMATE — Campos canônicos: Preço, Disponibilidade, Mínimo de Noites

**Data**: 2026-01-04  
**Objetivo**: Documentar o contrato de dados mínimo para que qualquer Client Site consiga renderizar catálogo (preço/capacidade/fotos) e regras (mín. noites) sem depender de patches no bundle do site.

---

## 1) Contexto

Na prática, o catálogo público tem duas camadas:

- **Fonte**: `properties.data` (JSONB)
- **Contrato público (DTO)**: resposta do endpoint `rendizy-public` em:
  - `GET /client-sites/api/:subdomain/properties`

A estratégia escalável é: **o backend garante o shape do DTO**, mesmo que `data` esteja incompleto. Onde possível, o backend também pode **backfill** valores canônicos dentro de `data` para simplificar o ecossistema.

---

## 2) O que existe hoje em `properties.data` (observado no caso MedHome)

### 2.1 Fotos

- `data.rooms[]?.photos[]` costuma existir.
- `data.cover_photo_id` costuma existir.

O backend normaliza isso para:

- `photos[]` (lista de URLs)
- `coverPhoto` (URL)

### 2.2 Capacidade (já resolvido)

- `data.rooms[]?.beds` pode existir como “mapa” (objeto) de tipos de cama → quantidade.
  - Exemplo (real):
    - `{ "cama-casal-1p": 1, "cama-solteiro-2p": 1 }`

Regra adotada:

- `maxGuests` derivado por soma de camas (ex.: casal=2, solteiro=1) e aplicado em:
  - `data.guests`, `data.maxGuests`, `data.max_guests` (backfill)
  - `DTO.capacity.maxGuests` (API pública)

### 2.3 Preço (causa típica de `NaN`)

No caso MedHome, o `data` **não tinha preço preenchido** (ausente ou `0`).

Quando o Client Site tenta formatar preço a partir de `undefined`/`null` (ou string não numérica), o resultado típico é `NaN`.

---

## 3) Contrato recomendado (canônico) dentro de `properties.data`

Para evitar múltiplos formatos e “adivinhar” campos em cada site, padronizar em `data.pricing` + `data.rules`.

### 3.1 Preço

Campos recomendados:

```json
{
  "pricing": {
    "currency": "BRL",
    "dailyRate": 350,
    "weeklyRate": 2100,
    "monthlyRate": 7500
  }
}
```

Regras:

- Todos os rates devem ser **número** (inteiro ou float), nunca string.
- `currency` deve ser string ISO (ex.: `BRL`).
- `dailyRate` é o campo mínimo para o catálogo.

Fallbacks aceitáveis (temporários):

- Se só existir `basePrice`, o backend pode mapear para `dailyRate`.

### 3.2 Mínimo de noites

Campos recomendados:

```json
{
  "rules": {
    "minNights": 1
  }
}
```

Regras:

- `minNights` deve ser número inteiro >= 1.
- Se ausente, o backend deve assumir `1` no DTO público.

### 3.3 Disponibilidade

Importante: disponibilidade geralmente não vive “fixa” dentro do anúncio, porque depende de:

- reservas
- bloqueios
- calendário externo (StaysNet/Channel manager)

Recomendação:

- **Não** tentar “serializar a disponibilidade inteira” em `properties.data`.
- Servir disponibilidade via endpoint próprio (e cacheável) por intervalo:

```
GET /client-sites/api/:subdomain/availability?propertyId=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD
```

Caso o produto precise de um “estado rápido” no card, usar um campo resumido:

```json
{
  "availability": {
    "source": "staysnet",
    "status": "unknown" 
  }
}
```

Onde `status` é apenas informativo (não substitui calendário).

---

## 4) Mapeamento para o DTO público (o que o site deveria consumir)

Formato (resumo) recomendado no DTO retornado por `rendizy-public`:

```json
{
  "id": "<uuid>",
  "title": "...",
  "pricing": {
    "currency": "BRL",
    "dailyRate": 350,
    "weeklyRate": 2100,
    "monthlyRate": 7500
  },
  "rules": {
    "minNights": 1
  },
  "capacity": {
    "maxGuests": 3,
    "bedrooms": 1,
    "bathrooms": 1
  },
  "photos": ["https://..."],
  "coverPhoto": "https://..."
}
```

Notas:

- O Client Site deve conseguir renderizar card/lista **apenas** com `pricing.dailyRate`, `coverPhoto` e `capacity.maxGuests`.
- Se `pricing.dailyRate` for `0`/ausente no source, o DTO deve retornar `0` (número), nunca `null`/string, para evitar `NaN`.

---

## 5) Diretrizes práticas (para não virar patch por site)

- Definir 1 “contrato público” e manter compatibilidade retroativa.
- Evitar depender do bundle compilado do site para “normalizar dados”.
- Onde for determinístico (ex.: capacidade por camas), fazer:
  - normalização no backend + backfill em `properties.data`.
- Onde não for determinístico (ex.: preço e disponibilidade), exigir:
  - preenchimento explícito na origem (ingest/admin) ou
  - um pipeline confiável que compute/importe.

---

## 6) Referências no repo

- Função pública (DTO): `supabase/functions/rendizy-public/index.ts`
- Arquitetura do proxy + serve: `docs/02-architecture/ARQUITETURA_CLIENT_SITES_PROXY_SUPABASE_MEDHOME_2026-01-04.md`
- Backfill de capacidade: `scripts/backfill-properties-capacity.ps1`
- Backfill de preço (manual): `scripts/backfill-properties-pricing.ps1`
