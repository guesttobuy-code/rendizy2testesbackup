# Stays API — finance export (direto) — 20251226-033401

## Objetivo
- Extrair dados financeiros direto da Stays (fonte de verdade) para mapear campos reais de owners/provedores/pagamentos.

## Como foi extraído
- Base URL: `https://bvm.stays.net/external/v1`
- Período (owners): `from=2024-12-31`, `to=2025-12-26`
- payment-providers.status: `(vazio)`
- sampleOwnerDetails: **1**
- sampleReservationPayments: **2**

## Saída
- payment_providers raw: `_reports/staysnet-api-exports/finance-20251226-033401/payment_providers_raw.json`
- owners raw: `_reports/staysnet-api-exports/finance-20251226-033401/owners_raw.json`
- owner details sample: `_reports/staysnet-api-exports/finance-20251226-033401/owner_details_samples.json`
- reservation payments sample: `_reports/staysnet-api-exports/finance-20251226-033401/reservation_payments_samples.json`
- Meta: `_reports/staysnet-api-exports/finance-20251226-033401/meta.json`

## Resultado
- payment providers: **14**
- owners: **95**
- owner details sampled: **1**
- reservation payments sampled: **2**

## Enum candidates (observado)

### payment-providers.type
- bank: 8
- stripe: 4
- cielo: 1
- pagarmeV5: 1

### payment-providers.status
- active: 9
- inactive: 5

### owners/{ownerId}.status (amostra)
- (vazio): 1

## Paths observados (amostra)
| path |
|---|
| ownerDetails |
| ownerDetails._id |
| ownerDetails.credit |
| ownerDetails.credit._mcval |
| ownerDetails.credit._mcval.BRL |
| ownerDetails.dateRange |
| ownerDetails.dateRange.from |
| ownerDetails.dateRange.to |
| ownerDetails.debit |
| ownerDetails.debit._mcval |
| ownerDetails.debit._mcval.BRL |
| ownerDetails.listings |
| ownerDetails.listings[] |
| ownerDetails.listings[]._id |
| ownerDetails.listings[].accounts |
| ownerDetails.listings[].accounts[] |
| ownerDetails.listings[].accounts[]._id |
| ownerDetails.listings[].accounts[]._mcfee |
| ownerDetails.listings[].accounts[]._mcfee.BRL |
| ownerDetails.listings[].accounts[]._mctax |
| ownerDetails.listings[].accounts[]._mctax.BRL |
| ownerDetails.listings[].accounts[]._mcval |
| ownerDetails.listings[].accounts[]._mcval.BRL |
| ownerDetails.listings[].accounts[]._mcvalpaid |
| ownerDetails.listings[].accounts[]._mcvalpaid.BRL |
| ownerDetails.listings[].accounts[].date |
| ownerDetails.listings[].accounts[].internalName |
| ownerDetails.listings[].accounts[].internalNote |
| ownerDetails.listings[].accounts[].paymentDate |
| ownerDetails.listings[].accounts[].reserveId |
| ownerDetails.listings[].accounts[].status |
| ownerDetails.listings[].accounts[].transactionName |
| ownerDetails.listings[].accounts[].type |
| ownerDetails.listings[].balance |
| ownerDetails.listings[].balance._mcval |
| ownerDetails.listings[].balance._mcval.BRL |
| ownerDetails.listings[].credit |
| ownerDetails.listings[].credit._mcval |
| ownerDetails.listings[].credit._mcval.BRL |
| ownerDetails.listings[].debit |
| ownerDetails.listings[].debit._mcval |
| ownerDetails.listings[].debit._mcval.BRL |
| ownerDetails.listings[].deff_curr |
| ownerDetails.listings[].id |
| ownerDetails.listings[].internalName |
| ownerDetails.listings[].lifeBalance |
| ownerDetails.listings[].lifeBalance._mcval |
| ownerDetails.listings[].lifeBalance._mcval.BRL |
| ownerDetails.listings[].lifeCredit |
| ownerDetails.listings[].lifeCredit._mcval |
| ownerDetails.listings[].lifeCredit._mcval.BRL |
| ownerDetails.listings[].lifeDebit |
| ownerDetails.listings[].lifeDebit._mcval |
| ownerDetails.listings[].lifeDebit._mcval.BRL |
| ownerDetails.name |
| owners |
| owners[] |
| owners[]._id |
| owners[].credit |
| owners[].credit._mcval |
| owners[].credit._mcval.BRL |
| owners[].dateRange |
| owners[].dateRange.from |
| owners[].dateRange.to |
| owners[].debit |
| owners[].debit._mcval |
| owners[].debit._mcval.BRL |
| owners[].listings |
| owners[].listings[] |
| owners[].listings[]._id |
| owners[].listings[].id |
| owners[].listings[].internalName |
| owners[].name |
| paymentProviders |
| paymentProviders[] |
| paymentProviders[]._id |
| paymentProviders[]._mcstartBalance |
| paymentProviders[]._mcstartBalance.BRL |
| paymentProviders[]._msdesc |
| paymentProviders[]._msdesc.pt_BR |
| paymentProviders[]._mstitle |
| paymentProviders[]._mstitle.pt_BR |
| paymentProviders[].allowPayments |
| paymentProviders[].currencies |
| paymentProviders[].currencies[] |
| paymentProviders[].internalName |
| paymentProviders[].status |
| paymentProviders[].type |
| reservationPayments |
| reservationPayments[] |
| reservationPayments[]._f_val |
| reservationPayments[]._id |
| reservationPayments[]._idpaymentProvider |
| reservationPayments[]._idreserve |
| reservationPayments[].expirationDate |
| reservationPayments[].name |
| reservationPayments[].readonly |
| reservationPayments[].status |
| reservationPayments[].type |

## Nota de segurança
- Exports podem conter informações financeiras e dados pessoais (nomes/notas). Evite commitar `_reports/`.