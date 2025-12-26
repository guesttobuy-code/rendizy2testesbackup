# Stays API — schema consolidado (observado) — 20251226-033425

## Objetivo
- Consolidar os campos observados nos exports diretos da Stays (fonte de verdade) para imóveis, hóspedes, reservas e financeiro.
- Este documento é baseado em *evidência* (JSON exportado), não em “achismo” do banco local.

## Segurança
- Os exports em `_reports/` podem conter PII e dados financeiros. Não commitar `_reports/`.
- Este consolidado lista apenas **paths** e **candidatos a enum** (sem valores pessoais).

## Fontes (últimos exports detectados)
| domínio | export dir | fetched | endpoint |
|---|---|---:|---|
| reservations | _reports/staysnet-api-exports/reservations-20251226-032107 | 100 | /booking/reservations |
| listings | _reports/staysnet-api-exports/listings-20251226-033312 | 40 | /content/listings |
| clients | _reports/staysnet-api-exports/clients-20251226-033314 | 20 | /booking/clients |
| finance | _reports/staysnet-api-exports/finance-20251226-033401 | 95 | /finance/owners |

## Paths por domínio (amostra)

### reservations
| path |
|---|
| reservations |
| reservations._id |
| reservations._idclient |
| reservations._idlisting |
| reservations.checkInDate |
| reservations.checkInTime |
| reservations.checkOutDate |
| reservations.checkOutTime |
| reservations.creationDate |
| reservations.guests |
| reservations.guestsDetails |
| reservations.guestsDetails.adults |
| reservations.guestsDetails.children |
| reservations.guestsDetails.infants |
| reservations.id |
| reservations.partner |
| reservations.partner._id |
| reservations.partner.commission |
| reservations.partner.commission._mcval |
| reservations.partner.commission._mcval.BRL |
| reservations.partner.commission.type |
| reservations.partner.name |
| reservations.partnerCode |
| reservations.price |
| reservations.price._f_expected |
| reservations.price._f_total |
| reservations.price.currency |
| reservations.price.extrasDetails |
| reservations.price.extrasDetails._f_total |
| reservations.price.extrasDetails.discounts |
| reservations.price.extrasDetails.discounts[] |
| reservations.price.extrasDetails.extraServices |
| reservations.price.extrasDetails.extraServices[] |
| reservations.price.extrasDetails.fees |
| reservations.price.extrasDetails.fees[] |
| reservations.price.hostingDetails |
| reservations.price.hostingDetails._f_nightPrice |
| reservations.price.hostingDetails._f_total |
| reservations.price.hostingDetails.discounts |
| reservations.price.hostingDetails.discounts[] |
| reservations.price.hostingDetails.fees |
| reservations.price.hostingDetails.fees[] |
| reservations.price.hostingDetails.fees[]._f_val |
| reservations.price.hostingDetails.fees[].name |
| reservations.reservationUrl |
| reservations.stats |
| reservations.stats._f_totalPaid |
| reservations.type |

### listings
| path |
|---|
| listings |
| listings._f_bathrooms |
| listings._f_square |
| listings._i_beds |
| listings._i_maxGuests |
| listings._i_rooms |
| listings._id |
| listings._idmainImage |
| listings._idproperty |
| listings._idpropertyType |
| listings._idtype |
| listings._msdesc |
| listings._msdesc.en_US |
| listings._msdesc.pt_BR |
| listings._mstitle |
| listings._mstitle.en_US |
| listings._mstitle.pt_BR |
| listings._t_mainImageMeta |
| listings._t_mainImageMeta.url |
| listings._t_propertyTypeMeta |
| listings._t_propertyTypeMeta._mstitle |
| listings._t_propertyTypeMeta._mstitle.de_DE |
| listings._t_propertyTypeMeta._mstitle.el_GR |
| listings._t_propertyTypeMeta._mstitle.en_US |
| listings._t_propertyTypeMeta._mstitle.es_ES |
| listings._t_propertyTypeMeta._mstitle.fr_FR |
| listings._t_propertyTypeMeta._mstitle.it_IT |
| listings._t_propertyTypeMeta._mstitle.pt_BR |
| listings._t_propertyTypeMeta._mstitle.pt_PT |
| listings._t_propertyTypeMeta._mstitle.ru_RU |
| listings._t_propertyTypeMeta._mstitle.sv_SE |
| listings._t_typeMeta |
| listings._t_typeMeta._mstitle |
| listings._t_typeMeta._mstitle.de_DE |
| listings._t_typeMeta._mstitle.el_GR |
| listings._t_typeMeta._mstitle.en_US |
| listings._t_typeMeta._mstitle.es_ES |
| listings._t_typeMeta._mstitle.fr_FR |
| listings._t_typeMeta._mstitle.it_IT |
| listings._t_typeMeta._mstitle.pt_BR |
| listings._t_typeMeta._mstitle.pt_PT |
| listings._t_typeMeta._mstitle.ru_RU |
| listings._t_typeMeta._mstitle.sv_SE |
| listings.address |
| listings.address.additional |
| listings.address.city |
| listings.address.countryCode |
| listings.address.region |
| listings.address.state |
| listings.address.stateCode |
| listings.address.street |
| listings.address.streetNumber |
| listings.address.zip |
| listings.deff_curr |
| listings.groupIds |
| listings.groupIds[] |
| listings.id |
| listings.instantBooking |
| listings.internalName |
| listings.latLng |
| listings.latLng._f_lat |
| listings.latLng._f_lng |
| listings.listingCategories |
| listings.listingCategories[] |
| listings.otaChannels |
| listings.otaChannels[] |
| listings.otaChannels[].name |
| listings.status |
| listings.subtype |

### clients
| path |
|---|
| clients |
| clients._id |
| clients.clientSource |
| clients.contactEmails |
| clients.contactEmails[] |
| clients.contactEmails[].adr |
| clients.contactEmails[].type |
| clients.creationDate |
| clients.email |
| clients.fName |
| clients.isUser |
| clients.kind |
| clients.lName |
| clients.name |
| clients.nationality |

### finance
| path |
|---|
| finance |
| finance._id |
| finance.credit |
| finance.credit._mcval |
| finance.credit._mcval.BRL |
| finance.dateRange |
| finance.dateRange.from |
| finance.dateRange.to |
| finance.debit |
| finance.debit._mcval |
| finance.debit._mcval.BRL |
| finance.listings |
| finance.listings[] |
| finance.listings[]._id |
| finance.listings[].id |
| finance.listings[].internalName |
| finance.name |

## Union de paths (todos os domínios)
| path |
|---|
| clients |
| clients._id |
| clients.clientSource |
| clients.contactEmails |
| clients.contactEmails[] |
| clients.contactEmails[].adr |
| clients.contactEmails[].type |
| clients.creationDate |
| clients.email |
| clients.fName |
| clients.isUser |
| clients.kind |
| clients.lName |
| clients.name |
| clients.nationality |
| finance |
| finance._id |
| finance.credit |
| finance.credit._mcval |
| finance.credit._mcval.BRL |
| finance.dateRange |
| finance.dateRange.from |
| finance.dateRange.to |
| finance.debit |
| finance.debit._mcval |
| finance.debit._mcval.BRL |
| finance.listings |
| finance.listings[] |
| finance.listings[]._id |
| finance.listings[].id |
| finance.listings[].internalName |
| finance.name |
| listings |
| listings._f_bathrooms |
| listings._f_square |
| listings._i_beds |
| listings._i_maxGuests |
| listings._i_rooms |
| listings._id |
| listings._idmainImage |
| listings._idproperty |
| listings._idpropertyType |
| listings._idtype |
| listings._msdesc |
| listings._msdesc.en_US |
| listings._msdesc.pt_BR |
| listings._mstitle |
| listings._mstitle.en_US |
| listings._mstitle.pt_BR |
| listings._t_mainImageMeta |
| listings._t_mainImageMeta.url |
| listings._t_propertyTypeMeta |
| listings._t_propertyTypeMeta._mstitle |
| listings._t_propertyTypeMeta._mstitle.de_DE |
| listings._t_propertyTypeMeta._mstitle.el_GR |
| listings._t_propertyTypeMeta._mstitle.en_US |
| listings._t_propertyTypeMeta._mstitle.es_ES |
| listings._t_propertyTypeMeta._mstitle.fr_FR |
| listings._t_propertyTypeMeta._mstitle.it_IT |
| listings._t_propertyTypeMeta._mstitle.pt_BR |
| listings._t_propertyTypeMeta._mstitle.pt_PT |
| listings._t_propertyTypeMeta._mstitle.ru_RU |
| listings._t_propertyTypeMeta._mstitle.sv_SE |
| listings._t_typeMeta |
| listings._t_typeMeta._mstitle |
| listings._t_typeMeta._mstitle.de_DE |
| listings._t_typeMeta._mstitle.el_GR |
| listings._t_typeMeta._mstitle.en_US |
| listings._t_typeMeta._mstitle.es_ES |
| listings._t_typeMeta._mstitle.fr_FR |
| listings._t_typeMeta._mstitle.it_IT |
| listings._t_typeMeta._mstitle.pt_BR |
| listings._t_typeMeta._mstitle.pt_PT |
| listings._t_typeMeta._mstitle.ru_RU |
| listings._t_typeMeta._mstitle.sv_SE |
| listings.address |
| listings.address.additional |
| listings.address.city |
| listings.address.countryCode |
| listings.address.region |
| listings.address.state |
| listings.address.stateCode |
| listings.address.street |
| listings.address.streetNumber |
| listings.address.zip |
| listings.deff_curr |
| listings.groupIds |
| listings.groupIds[] |
| listings.id |
| listings.instantBooking |
| listings.internalName |
| listings.latLng |
| listings.latLng._f_lat |
| listings.latLng._f_lng |
| listings.listingCategories |
| listings.listingCategories[] |
| listings.otaChannels |
| listings.otaChannels[] |
| listings.otaChannels[].name |
| listings.status |
| listings.subtype |
| reservations |
| reservations._id |
| reservations._idclient |
| reservations._idlisting |
| reservations.checkInDate |
| reservations.checkInTime |
| reservations.checkOutDate |
| reservations.checkOutTime |
| reservations.creationDate |
| reservations.guests |
| reservations.guestsDetails |
| reservations.guestsDetails.adults |
| reservations.guestsDetails.children |
| reservations.guestsDetails.infants |
| reservations.id |
| reservations.partner |
| reservations.partner._id |
| reservations.partner.commission |
| reservations.partner.commission._mcval |
| reservations.partner.commission._mcval.BRL |
| reservations.partner.commission.type |
| reservations.partner.name |
| reservations.partnerCode |
| reservations.price |
| reservations.price._f_expected |
| reservations.price._f_total |
| reservations.price.currency |
| reservations.price.extrasDetails |
| reservations.price.extrasDetails._f_total |
| reservations.price.extrasDetails.discounts |
| reservations.price.extrasDetails.discounts[] |
| reservations.price.extrasDetails.extraServices |
| reservations.price.extrasDetails.extraServices[] |
| reservations.price.extrasDetails.fees |
| reservations.price.extrasDetails.fees[] |
| reservations.price.hostingDetails |
| reservations.price.hostingDetails._f_nightPrice |
| reservations.price.hostingDetails._f_total |
| reservations.price.hostingDetails.discounts |
| reservations.price.hostingDetails.discounts[] |
| reservations.price.hostingDetails.fees |
| reservations.price.hostingDetails.fees[] |
| reservations.price.hostingDetails.fees[]._f_val |
| reservations.price.hostingDetails.fees[].name |
| reservations.reservationUrl |
| reservations.stats |
| reservations.stats._f_totalPaid |
| reservations.type |

## Reproduzir (scripts)
- `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/run-extract-staysnet-api-listings-direct.ps1 -MaxPages 5 -Limit 20`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/run-extract-staysnet-api-reservations-direct.ps1 -MaxPages 5 -Limit 20`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/run-extract-staysnet-api-clients-direct.ps1 -MaxPages 5 -Limit 20 -SampleDetails 2`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/run-extract-staysnet-api-finance-direct.ps1 -SampleOwnerDetails 2 -SampleReservationPayments 5`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/run-generate-staysnet-api-schema-consolidated.ps1`