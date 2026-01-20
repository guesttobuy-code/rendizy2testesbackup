# Stays API — reservations export (direto) — 20251226-035228

## Objetivo
- Extrair direto do endpoint da Stays (fonte de verdade) para validar campos reais e evitar “achismo” baseado só no nosso banco.

## Como foi extraído
- Endpoint: `/booking/reservations`
- Base URL: `https://bvm.stays.net/external/v1`
- Query: `from=2024-12-26`, `to=2026-12-26`, `dateType=arrival`
- Types: `reserved`, `booked`, `contract`
- Paginação: `limit=20`, `maxPages=1`, `startSkip=0`

## Saída
- Raw JSON: `_reports/staysnet-api-exports/reservations-20251226-035228/reservations_raw.json`
- Reserva(s) específica(s): `_reports/staysnet-api-exports/reservations-20251226-035228/reservations_single_raw.json`
- Meta: `_reports/staysnet-api-exports/reservations-20251226-035228/meta.json`

## Resultado
- Fetched: **21**
- next.skip: **20**
- next.hasMore: **true**

## Campos observados (alto nível)
- Top-level keys (1ª reserva): `_id`, `_idclient`, `_idlisting`, `checkInDate`, `checkInTime`, `checkOutDate`, `checkOutTime`, `creationDate`, `guests`, `guestsDetails`, `id`, `partner`, `partnerCode`, `price`, `reservationUrl`, `stats`, `type`
- Existe campo `status` no payload? **NÃO (nesta amostra)**

## Enum candidates (observado)

### type
- booked: 21

### status
- (vazio): 21

### partner.name
- API booking.com: 19
- API Decolar: 1
- API airbnb: 1

### partnerCode
- 6342499387: 1
- 5557741735: 1
- 6050319579: 1
- 5736246582: 1
- 6409855312: 1
- 5643769116: 1
- 6775187338: 1
- 6170484539: 1
- 6591313400: 1
- 6350370912: 1
- 6619357292: 1
- 5783225144: 1
- 6707262328: 1
- 35662223502: 1
- 5828817822: 1
- 6268323268: 1
- 5099074910: 1
- 6011177501: 1
- 5769425884: 1
- 6622664756: 1
- HMERX23MAQ: 1

## price / stats (observado)
- price.currency: BRL (21)
- stats._f_totalPaid: min=240.27 max=25230.55 (amostra com 21 valores numéricos)

## Paths observados (amostra de até 20 reservas)
| path |
|---|
| (root) |
| _id |
| _idclient |
| _idlisting |
| checkInDate |
| checkInTime |
| checkOutDate |
| checkOutTime |
| creationDate |
| guests |
| guestsDetails |
| guestsDetails.adults |
| guestsDetails.children |
| guestsDetails.infants |
| id |
| partner |
| partner._id |
| partner.commission |
| partner.commission._mcval |
| partner.commission._mcval.BRL |
| partner.commission.type |
| partner.name |
| partnerCode |
| price |
| price._f_expected |
| price._f_total |
| price.currency |
| price.extrasDetails |
| price.extrasDetails._f_total |
| price.extrasDetails.discounts |
| price.extrasDetails.discounts[] |
| price.extrasDetails.extraServices |
| price.extrasDetails.extraServices[] |
| price.extrasDetails.fees |
| price.extrasDetails.fees[] |
| price.hostingDetails |
| price.hostingDetails._f_nightPrice |
| price.hostingDetails._f_total |
| price.hostingDetails.discounts |
| price.hostingDetails.discounts[] |
| price.hostingDetails.fees |
| price.hostingDetails.fees[] |
| price.hostingDetails.fees[]._f_val |
| price.hostingDetails.fees[].name |
| reservationUrl |
| stats |
| stats._f_totalPaid |
| type |

## Nota de segurança
- O arquivo raw pode conter dados pessoais (hóspedes). Evite commitar esses exports no GitHub; use apenas localmente para auditoria/mapeamento.