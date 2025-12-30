# Runbook — Stays.net Blocks (Modal + Calendário)

## Sintomas comuns

- “Importou bloqueios mas não aparecem no calendário”
- “Bloqueio virou reserva”
- “De repente sumiram todos os cards do calendário”

## 1) Validar import via script (repetível)

Rodar (gera log e stats):

- `pwsh .\TEST-STAYSNET-MODULAR.ps1 -IncludeBlocks -MaxPages 3 -MaxBatches 5`

O que olhar:
- `BLOCKS IMPORTADOS: Saved` deve ser > 0 (para o período/seleção).
- Se `Saved=0` com `Errors=0`, verificar seleção e vínculo do listing → UUID interno.

## 2) Verificar tenant/session

Se token expirar, o backend pode falhar por sessão:
- Gere novo token: `pwsh .\GERAR-TOKEN.ps1`

Regra:
- Com token presente, o backend deve usar o organization_id real (não DEFAULT).

## 3) Validar fetch do calendário

O calendário busca bloqueios por `propertyIds` internos via rota SQL:
- `GET /calendar/blocks?propertyIds=<uuid1,uuid2,...>`

Se os blocks existem no banco mas não aparecem:
- Confirmar que `property_id` do block é o UUID do `anuncios_ultimate.id`.
- Confirmar que `start_date/end_date` estão no range visível.

## 4) Se “sumiram todos os cards”

Isso geralmente é falha temporária de API/token.
A UI não deve limpar estado nessas falhas.

Verificar:
- Hooks de fetch devem lançar erro (não retornar `[]`).

## 5) Diagnóstico rápido de vínculo (Stays listing → anúncios_ultimate)

Quando o modal seleciona properties, ele manda IDs da Stays.
O backend precisa resolver:
- `data.externalIds.staysnet_listing_id`
- `data.externalIds.staysnet_property_id`
- `data.staysnet_raw.*`

Se não resolver, blocks serão “skipped”.

## 6) Regra de ouro (antirregressão)

Se mudar algo em Stays.net:
- Atualize também `docs/04-modules/STAYSNET_INTEGRATION_GOVERNANCE.md`
- Rode o teste modular com `-IncludeBlocks`
