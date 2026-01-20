# Stays API — schema consolidado (observado) — 20251226-034023

## Objetivo
- Consolidar os campos observados nos exports diretos da Stays (fonte de verdade) para imóveis, hóspedes, reservas e financeiro.
- Este documento é baseado em *evidência* (JSON exportado), não em “achismo” do banco local.

## Segurança
- Os exports em `_reports/` podem conter PII e dados financeiros. Não commitar `_reports/`.
- Este consolidado lista **paths** e **exemplos observados** (com PII mascarada por heurística).

## Fontes (últimos exports detectados)
| domínio | export dir | fetched | endpoint |
|---|---|---:|---|
| reservations | _reports/staysnet-api-exports/reservations-20251226-032107 | 100 | /booking/reservations |
| listings | _reports/staysnet-api-exports/listings-20251226-033312 | 40 | /content/listings |
| clients | _reports/staysnet-api-exports/clients-20251226-033314 | 20 | /booking/clients |
| finance | _reports/staysnet-api-exports/finance-20251226-033401 | 95 | /finance/owners |

## Paths por domínio (amostra)

### reservations
| path | exemplo |
|---|---|
| reservations | {…} |
| reservations._id | [REDACTED_PHONE_**49] |
| reservations._idclient | [REDACTED_PHONE_**18] |
| reservations._idlisting | [REDACTED_PHONE_**22] |
| reservations.checkInDate | [REDACTED_PHONE_**05] |
| reservations.checkInTime | 14:00 |
| reservations.checkOutDate | [REDACTED_PHONE_**06] |
| reservations.checkOutTime | 12:00 |
| reservations.creationDate | [REDACTED_PHONE_**12] |
| reservations.guests | 3 |
| reservations.guestsDetails | {…} |
| reservations.guestsDetails.adults | 3 |
| reservations.guestsDetails.children | 0 |
| reservations.guestsDetails.infants | 0 |
| reservations.id | RV02J |
| reservations.partner | {…} |
| reservations.partner._id | [REDACTED_PHONE_**79] |
| reservations.partner.commission | {…} |
| reservations.partner.commission._mcval | {…} |
| reservations.partner.commission._mcval.BRL | 55.58 |
| reservations.partner.commission.type | fixed |
| reservations.partner.name | [REDACTED_NAME] |
| reservations.partnerCode | [REDACTED_PHONE_**87] |
| reservations.price | {…} |
| reservations.price._f_expected | 367.55 |
| reservations.price._f_total | 434.9 |
| reservations.price.currency | BRL |
| reservations.price.extrasDetails | {…} |
| reservations.price.extrasDetails._f_total | 0 |
| reservations.price.extrasDetails.discounts | […] |
| reservations.price.extrasDetails.discounts[] | null |
| reservations.price.extrasDetails.extraServices | […] |
| reservations.price.extrasDetails.extraServices[] | null |
| reservations.price.extrasDetails.fees | […] |
| reservations.price.extrasDetails.fees[] | null |
| reservations.price.hostingDetails | {…} |
| reservations.price.hostingDetails._f_nightPrice | 317.55 |
| reservations.price.hostingDetails._f_total | 434.9 |
| reservations.price.hostingDetails.discounts | […] |
| reservations.price.hostingDetails.discounts[] | null |
| reservations.price.hostingDetails.fees | […] |
| reservations.price.hostingDetails.fees[] | {…} |
| reservations.price.hostingDetails.fees[]._f_val | 60 |
| reservations.price.hostingDetails.fees[].name | [REDACTED_NAME] |
| reservations.reservationUrl | [REDACTED_PHONE_**02] |
| reservations.stats | {…} |
| reservations.stats._f_totalPaid | 434.9 |
| reservations.type | booked |

### listings
| path | exemplo |
|---|---|
| listings | {…} |
| listings._f_bathrooms | 1 |
| listings._f_square | 65 |
| listings._i_beds | 2 |
| listings._i_maxGuests | 4 |
| listings._i_rooms | 1 |
| listings._id | [REDACTED_PHONE_**09] |
| listings._idmainImage | [REDACTED_PHONE_**49] |
| listings._idproperty | [REDACTED_PHONE_**46] |
| listings._idpropertyType | [REDACTED_PHONE_**61] |
| listings._idtype | [REDACTED_PHONE_**50] |
| listings._msdesc | {…} |
| listings._msdesc.en_US | Very close to the center and Av Amaral Peixoto but is also close to Shopping … |
| listings._msdesc.pt_BR | <p>A casa fica muito bem localizada, mt próxima ao centro e Av Amaral Peixoto… |
| listings._mstitle | {…} |
| listings._mstitle.en_US | Entire apartment (1) with reversible living room |
| listings._mstitle.pt_BR | Apartamento(1) inteiro com sala reversivel |
| listings._t_mainImageMeta | {…} |
| listings._t_mainImageMeta.url | [REDACTED_PHONE_**49] |
| listings._t_propertyTypeMeta | {…} |
| listings._t_propertyTypeMeta._mstitle | {…} |
| listings._t_propertyTypeMeta._mstitle.de_DE | Ferienwohnung |
| listings._t_propertyTypeMeta._mstitle.el_GR | (empty) |
| listings._t_propertyTypeMeta._mstitle.en_US | Apartment |
| listings._t_propertyTypeMeta._mstitle.es_ES | Departamento |
| listings._t_propertyTypeMeta._mstitle.fr_FR | (empty) |
| listings._t_propertyTypeMeta._mstitle.it_IT | (empty) |
| listings._t_propertyTypeMeta._mstitle.pt_BR | Apartamento |
| listings._t_propertyTypeMeta._mstitle.pt_PT | Apartamento |
| listings._t_propertyTypeMeta._mstitle.ru_RU | (empty) |
| listings._t_propertyTypeMeta._mstitle.sv_SE | (empty) |
| listings._t_typeMeta | {…} |
| listings._t_typeMeta._mstitle | {…} |
| listings._t_typeMeta._mstitle.de_DE | Ferienwohnung |
| listings._t_typeMeta._mstitle.el_GR | (empty) |
| listings._t_typeMeta._mstitle.en_US | Apartment |
| listings._t_typeMeta._mstitle.es_ES | Departamento |
| listings._t_typeMeta._mstitle.fr_FR | (empty) |
| listings._t_typeMeta._mstitle.it_IT | (empty) |
| listings._t_typeMeta._mstitle.pt_BR | Apartamento |
| listings._t_typeMeta._mstitle.pt_PT | Apartamento |
| listings._t_typeMeta._mstitle.ru_RU | (empty) |
| listings._t_typeMeta._mstitle.sv_SE | (empty) |
| listings.address | {…} |
| listings.address.additional | [REDACTED_ADDRESS] |
| listings.address.city | [REDACTED_ADDRESS] |
| listings.address.countryCode | [REDACTED_ADDRESS] |
| listings.address.region | [REDACTED_ADDRESS] |
| listings.address.state | [REDACTED_ADDRESS] |
| listings.address.stateCode | [REDACTED_ADDRESS] |
| listings.address.street | [REDACTED_ADDRESS] |
| listings.address.streetNumber | [REDACTED_ADDRESS] |
| listings.address.zip | [REDACTED_ADDRESS] |
| listings.deff_curr | BRL |
| listings.groupIds | […] |
| listings.groupIds[] | [REDACTED_PHONE_**13] |
| listings.id | PY02H |
| listings.instantBooking | true |
| listings.internalName | [REDACTED_NAME] |
| listings.latLng | {…} |
| listings.latLng._f_lat | -22.5144376 |
| listings.latLng._f_lng | -44.0850892 |
| listings.listingCategories | […] |
| listings.listingCategories[] | vacationRental |
| listings.otaChannels | […] |
| listings.otaChannels[] | {…} |
| listings.otaChannels[].name | [REDACTED_NAME] |
| listings.status | active |
| listings.subtype | entire_home |

### clients
| path | exemplo |
|---|---|
| clients | {…} |
| clients._id | [REDACTED_PHONE_**93] |
| clients.clientSource | airbnb |
| clients.contactEmails | […] |
| clients.contactEmails[] | {…} |
| clients.contactEmails[].adr | [REDACTED_EMAIL] |
| clients.contactEmails[].type | [REDACTED_EMAIL] |
| clients.creationDate | [REDACTED_PHONE_**25] |
| clients.email | [REDACTED_EMAIL] |
| clients.fName | [REDACTED_NAME] |
| clients.isUser | false |
| clients.kind | person |
| clients.lName | [REDACTED_NAME] |
| clients.name | [REDACTED_NAME] |
| clients.nationality | BR |

### finance
| path | exemplo |
|---|---|
| finance | {…} |
| finance._id | [REDACTED_PHONE_**48] |
| finance.credit | {…} |
| finance.credit._mcval | {…} |
| finance.credit._mcval.BRL | 52537.21 |
| finance.dateRange | {…} |
| finance.dateRange.from | [REDACTED_PHONE_**31] |
| finance.dateRange.to | [REDACTED_PHONE_**26] |
| finance.debit | {…} |
| finance.debit._mcval | {…} |
| finance.debit._mcval.BRL | 26787 |
| finance.listings | […] |
| finance.listings[] | {…} |
| finance.listings[]._id | [REDACTED_PHONE_**92] |
| finance.listings[].id | NO01I |
| finance.listings[].internalName | [REDACTED_NAME] |
| finance.name | [REDACTED_NAME] |

## Union de paths (todos os domínios)
| path | exemplo |
|---|---|
| clients | {…} |
| clients._id | [REDACTED_PHONE_**93] |
| clients.clientSource | airbnb |
| clients.contactEmails | […] |
| clients.contactEmails[] | {…} |
| clients.contactEmails[].adr | [REDACTED_EMAIL] |
| clients.contactEmails[].type | [REDACTED_EMAIL] |
| clients.creationDate | [REDACTED_PHONE_**25] |
| clients.email | [REDACTED_EMAIL] |
| clients.fName | [REDACTED_NAME] |
| clients.isUser | false |
| clients.kind | person |
| clients.lName | [REDACTED_NAME] |
| clients.name | [REDACTED_NAME] |
| clients.nationality | BR |
| finance | {…} |
| finance._id | [REDACTED_PHONE_**48] |
| finance.credit | {…} |
| finance.credit._mcval | {…} |
| finance.credit._mcval.BRL | 52537.21 |
| finance.dateRange | {…} |
| finance.dateRange.from | [REDACTED_PHONE_**31] |
| finance.dateRange.to | [REDACTED_PHONE_**26] |
| finance.debit | {…} |
| finance.debit._mcval | {…} |
| finance.debit._mcval.BRL | 26787 |
| finance.listings | […] |
| finance.listings[] | {…} |
| finance.listings[]._id | [REDACTED_PHONE_**92] |
| finance.listings[].id | NO01I |
| finance.listings[].internalName | [REDACTED_NAME] |
| finance.name | [REDACTED_NAME] |
| listings | {…} |
| listings._f_bathrooms | 1 |
| listings._f_square | 65 |
| listings._i_beds | 2 |
| listings._i_maxGuests | 4 |
| listings._i_rooms | 1 |
| listings._id | [REDACTED_PHONE_**09] |
| listings._idmainImage | [REDACTED_PHONE_**49] |
| listings._idproperty | [REDACTED_PHONE_**46] |
| listings._idpropertyType | [REDACTED_PHONE_**61] |
| listings._idtype | [REDACTED_PHONE_**50] |
| listings._msdesc | {…} |
| listings._msdesc.en_US | Very close to the center and Av Amaral Peixoto but is also close to Shopping … |
| listings._msdesc.pt_BR | <p>A casa fica muito bem localizada, mt próxima ao centro e Av Amaral Peixoto… |
| listings._mstitle | {…} |
| listings._mstitle.en_US | Entire apartment (1) with reversible living room |
| listings._mstitle.pt_BR | Apartamento(1) inteiro com sala reversivel |
| listings._t_mainImageMeta | {…} |
| listings._t_mainImageMeta.url | [REDACTED_PHONE_**49] |
| listings._t_propertyTypeMeta | {…} |
| listings._t_propertyTypeMeta._mstitle | {…} |
| listings._t_propertyTypeMeta._mstitle.de_DE | Ferienwohnung |
| listings._t_propertyTypeMeta._mstitle.el_GR | (empty) |
| listings._t_propertyTypeMeta._mstitle.en_US | Apartment |
| listings._t_propertyTypeMeta._mstitle.es_ES | Departamento |
| listings._t_propertyTypeMeta._mstitle.fr_FR | (empty) |
| listings._t_propertyTypeMeta._mstitle.it_IT | (empty) |
| listings._t_propertyTypeMeta._mstitle.pt_BR | Apartamento |
| listings._t_propertyTypeMeta._mstitle.pt_PT | Apartamento |
| listings._t_propertyTypeMeta._mstitle.ru_RU | (empty) |
| listings._t_propertyTypeMeta._mstitle.sv_SE | (empty) |
| listings._t_typeMeta | {…} |
| listings._t_typeMeta._mstitle | {…} |
| listings._t_typeMeta._mstitle.de_DE | Ferienwohnung |
| listings._t_typeMeta._mstitle.el_GR | (empty) |
| listings._t_typeMeta._mstitle.en_US | Apartment |
| listings._t_typeMeta._mstitle.es_ES | Departamento |
| listings._t_typeMeta._mstitle.fr_FR | (empty) |
| listings._t_typeMeta._mstitle.it_IT | (empty) |
| listings._t_typeMeta._mstitle.pt_BR | Apartamento |
| listings._t_typeMeta._mstitle.pt_PT | Apartamento |
| listings._t_typeMeta._mstitle.ru_RU | (empty) |
| listings._t_typeMeta._mstitle.sv_SE | (empty) |
| listings.address | {…} |
| listings.address.additional | [REDACTED_ADDRESS] |
| listings.address.city | [REDACTED_ADDRESS] |
| listings.address.countryCode | [REDACTED_ADDRESS] |
| listings.address.region | [REDACTED_ADDRESS] |
| listings.address.state | [REDACTED_ADDRESS] |
| listings.address.stateCode | [REDACTED_ADDRESS] |
| listings.address.street | [REDACTED_ADDRESS] |
| listings.address.streetNumber | [REDACTED_ADDRESS] |
| listings.address.zip | [REDACTED_ADDRESS] |
| listings.deff_curr | BRL |
| listings.groupIds | […] |
| listings.groupIds[] | [REDACTED_PHONE_**13] |
| listings.id | PY02H |
| listings.instantBooking | true |
| listings.internalName | [REDACTED_NAME] |
| listings.latLng | {…} |
| listings.latLng._f_lat | -22.5144376 |
| listings.latLng._f_lng | -44.0850892 |
| listings.listingCategories | […] |
| listings.listingCategories[] | vacationRental |
| listings.otaChannels | […] |
| listings.otaChannels[] | {…} |
| listings.otaChannels[].name | [REDACTED_NAME] |
| listings.status | active |
| listings.subtype | entire_home |
| reservations | {…} |
| reservations._id | [REDACTED_PHONE_**49] |
| reservations._idclient | [REDACTED_PHONE_**18] |
| reservations._idlisting | [REDACTED_PHONE_**22] |
| reservations.checkInDate | [REDACTED_PHONE_**05] |
| reservations.checkInTime | 14:00 |
| reservations.checkOutDate | [REDACTED_PHONE_**06] |
| reservations.checkOutTime | 12:00 |
| reservations.creationDate | [REDACTED_PHONE_**12] |
| reservations.guests | 3 |
| reservations.guestsDetails | {…} |
| reservations.guestsDetails.adults | 3 |
| reservations.guestsDetails.children | 0 |
| reservations.guestsDetails.infants | 0 |
| reservations.id | RV02J |
| reservations.partner | {…} |
| reservations.partner._id | [REDACTED_PHONE_**79] |
| reservations.partner.commission | {…} |
| reservations.partner.commission._mcval | {…} |
| reservations.partner.commission._mcval.BRL | 55.58 |
| reservations.partner.commission.type | fixed |
| reservations.partner.name | [REDACTED_NAME] |
| reservations.partnerCode | [REDACTED_PHONE_**87] |
| reservations.price | {…} |
| reservations.price._f_expected | 367.55 |
| reservations.price._f_total | 434.9 |
| reservations.price.currency | BRL |
| reservations.price.extrasDetails | {…} |
| reservations.price.extrasDetails._f_total | 0 |
| reservations.price.extrasDetails.discounts | […] |
| reservations.price.extrasDetails.discounts[] | null |
| reservations.price.extrasDetails.extraServices | […] |
| reservations.price.extrasDetails.extraServices[] | null |
| reservations.price.extrasDetails.fees | […] |
| reservations.price.extrasDetails.fees[] | null |
| reservations.price.hostingDetails | {…} |
| reservations.price.hostingDetails._f_nightPrice | 317.55 |
| reservations.price.hostingDetails._f_total | 434.9 |
| reservations.price.hostingDetails.discounts | […] |
| reservations.price.hostingDetails.discounts[] | null |
| reservations.price.hostingDetails.fees | […] |
| reservations.price.hostingDetails.fees[] | {…} |
| reservations.price.hostingDetails.fees[]._f_val | 60 |
| reservations.price.hostingDetails.fees[].name | [REDACTED_NAME] |
| reservations.reservationUrl | [REDACTED_PHONE_**02] |
| reservations.stats | {…} |
| reservations.stats._f_totalPaid | 434.9 |
| reservations.type | booked |

## Reproduzir (scripts)
- `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/run-extract-staysnet-api-listings-direct.ps1 -MaxPages 5 -Limit 20`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/run-extract-staysnet-api-reservations-direct.ps1 -MaxPages 5 -Limit 20`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/run-extract-staysnet-api-clients-direct.ps1 -MaxPages 5 -Limit 20 -SampleDetails 2`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/run-extract-staysnet-api-finance-direct.ps1 -SampleOwnerDetails 2 -SampleReservationPayments 5`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/run-generate-staysnet-api-schema-consolidated.ps1`