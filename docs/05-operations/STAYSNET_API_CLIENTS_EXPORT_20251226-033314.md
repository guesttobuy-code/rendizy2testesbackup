# Stays API — clients export (direto) — 20251226-033314

## Objetivo
- Extrair direto do endpoint de clientes/hóspedes (fonte de verdade) para validar campos reais e evitar gaps no nosso schema.

## Como foi extraído
- Endpoint: `/booking/clients`
- Base URL: `https://bvm.stays.net/external/v1`
- Paginação: `limit=20` (doc: max 20), `maxPages=1`, `startSkip=0`
- Amostra details: `sampleDetails=1` via `/booking/clients/{clientId}`

## Saída
- Raw JSON: `_reports/staysnet-api-exports/clients-20251226-033314/clients_raw.json`
- Details sample: `_reports/staysnet-api-exports/clients-20251226-033314/client_details_samples.json`
- Meta: `_reports/staysnet-api-exports/clients-20251226-033314/meta.json`

## Resultado
- Fetched: **20**
- next.skip: **20**
- next.hasMore: **true**

## Campos observados (alto nível)
- Top-level keys (1º client): `_id`, `clientSource`, `creationDate`, `fName`, `isUser`, `kind`, `lName`, `name`

## Enum candidates (observado — sem PII)

### kind
- person: 20

### isUser
- false: 20

### prefLang
- (vazio): 20

## Paths observados (amostra)
| path |
|---|
| (root) |
| _id |
| clientDetails |
| clientDetails._id |
| clientDetails.alternateLangs |
| clientDetails.alternateLangs[] |
| clientDetails.clientSource |
| clientDetails.creationDate |
| clientDetails.fName |
| clientDetails.isUser |
| clientDetails.kind |
| clientDetails.lName |
| clientDetails.name |
| clientDetails.phones |
| clientDetails.phones[] |
| clientDetails.phones[].hint |
| clientDetails.phones[].iso |
| clientDetails.prefLang |
| clientDetails.reservations |
| clientDetails.reservations[] |
| clientDetails.reservations[]._id |
| clientDetails.reservations[]._idclient |
| clientDetails.reservations[]._idlisting |
| clientDetails.reservations[].checkInDate |
| clientDetails.reservations[].checkInTime |
| clientDetails.reservations[].checkOutDate |
| clientDetails.reservations[].checkOutTime |
| clientDetails.reservations[].creationDate |
| clientDetails.reservations[].guests |
| clientDetails.reservations[].guestsDetails |
| clientDetails.reservations[].guestsDetails.adults |
| clientDetails.reservations[].guestsDetails.children |
| clientDetails.reservations[].guestsDetails.infants |
| clientDetails.reservations[].id |
| clientDetails.reservations[].partnerCode |
| clientDetails.reservations[].price |
| clientDetails.reservations[].price._f_expected |
| clientDetails.reservations[].price._f_total |
| clientDetails.reservations[].price.currency |
| clientDetails.reservations[].price.extrasDetails |
| clientDetails.reservations[].price.extrasDetails._f_total |
| clientDetails.reservations[].price.extrasDetails.discounts |
| clientDetails.reservations[].price.extrasDetails.discounts[] |
| clientDetails.reservations[].price.extrasDetails.extraServices |
| clientDetails.reservations[].price.extrasDetails.extraServices[] |
| clientDetails.reservations[].price.extrasDetails.fees |
| clientDetails.reservations[].price.extrasDetails.fees[] |
| clientDetails.reservations[].price.hostingDetails |
| clientDetails.reservations[].price.hostingDetails._f_total |
| clientDetails.reservations[].price.hostingDetails.discounts |
| clientDetails.reservations[].price.hostingDetails.discounts[] |
| clientDetails.reservations[].price.hostingDetails.fees |
| clientDetails.reservations[].price.hostingDetails.fees[] |
| clientDetails.reservations[].price.hostingDetails.fees[]._f_val |
| clientDetails.reservations[].price.hostingDetails.fees[].name |
| clientDetails.reservations[].reservationUrl |
| clientDetails.reservations[].stats |
| clientDetails.reservations[].stats._f_totalPaid |
| clientDetails.reservations[].type |
| clientSource |
| contactEmails |
| contactEmails[] |
| contactEmails[].adr |
| contactEmails[].type |
| creationDate |
| email |
| fName |
| isUser |
| kind |
| lName |
| name |
| nationality |

## Nota de segurança
- O raw de clientes contém PII (nome, email, documentos). Evite commitar esses exports; use apenas localmente para auditoria/mapeamento.