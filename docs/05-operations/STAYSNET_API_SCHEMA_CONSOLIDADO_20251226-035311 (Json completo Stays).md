# Stays API — schema consolidado (observado) — 20251226-035311

## Objetivo
- Consolidar os campos observados nos exports diretos da Stays (fonte de verdade) para imóveis, hóspedes, reservas e financeiro.
- Este documento é baseado em *evidência* (JSON exportado), não em “achismo” do banco local.

## Segurança
- Os exports em `_reports/` podem conter PII e dados financeiros. Não commitar `_reports/`.
- Este consolidado lista **paths** e **exemplos observados** com valores reais (ambiente seguro).

## Fontes (últimos exports detectados)
| domínio | export dir | fetched | endpoint |
|---|---|---:|---|
| reservations | _reports/staysnet-api-exports/reservations-20251226-035228 | 21 | /booking/reservations |
| listings | _reports/staysnet-api-exports/listings-20251226-033312 | 40 | /content/listings |
| clients | _reports/staysnet-api-exports/clients-20251226-033314 | 20 | /booking/clients |
| finance | _reports/staysnet-api-exports/finance-20251226-033401 | 95 | /finance/owners |

## Paths por domínio (amostra)

### reservations
| path | exemplo |
|---|---|
| reservations | {…} |
| reservations._id | 693bf2bd3a6d6379dd73a4c9 |
| reservations._idclient | 693bf2bb3a6d6379dd73a1b8 |
| reservations._idlisting | 67acf3502fe4d0496b8022eb |
| reservations.checkInDate | 2026-12-05 |
| reservations.checkInTime | 14:00 |
| reservations.checkOutDate | 2026-12-06 |
| reservations.checkOutTime | 12:00 |
| reservations.creationDate | 2025-12-12 |
| reservations.guests | 3 |
| reservations.guestsDetails | {…} |
| reservations.guestsDetails.adults | 3 |
| reservations.guestsDetails.children | 0 |
| reservations.guestsDetails.infants | 0 |
| reservations.id | RV02J |
| reservations.partner | {…} |
| reservations.partner._id | 5d1b5cbec62b271c78796479 |
| reservations.partner.commission | {…} |
| reservations.partner.commission._mcval | {…} |
| reservations.partner.commission._mcval.BRL | 55.58 |
| reservations.partner.commission.type | fixed |
| reservations.partner.name | API booking.com |
| reservations.partnerCode | 6342499387 |
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
| reservations.price.hostingDetails.fees[].name | Taxa de Limpeza * |
| reservations.reservationUrl | https://bvm.stays.net/i/account-overview/693bf2bb3a6d6379dd73a1b8?reserve=RV02J |
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
| listings._id | 63dd7e20333d8b60be510f9c |
| listings._idmainImage | 63dd83d5d4c4bd1f897c1b49 |
| listings._idproperty | 63e16e00526be845bec4ff6b |
| listings._idpropertyType | 5ae04e1022261d03ab814d61 |
| listings._idtype | 5ab8f8a2f6b2dc2e97f97050 |
| listings._msdesc | {…} |
| listings._msdesc.en_US | Very close to the center and Av Amaral Peixoto but is also close to Shopping Novo and Unimed. Cool and airy place. Workbench for home office and 500MB internet. Parking for your car in front of the house. The apt is 1 bedroom but the living room can be used as a second bedroom as it has a sofa bed and door. Smoking is not allowed inside the house but there is a hallway right next to it. On foot… |
| listings._msdesc.pt_BR | <p>A casa fica muito bem localizada, mt próxima ao centro e Av Amaral Peixoto mas também está próxima do Shopping novo e unimed. Local fresco e arejado. Bancada para home office e internet 500MB.<br>Estacionamento para seu carro na frente da casa.<br>O apt é de 1 Qrt mas a sala pode ser utilizada como um segundo qrt pois tem sofá cama e porta.<br>Não é permitido fumar dentro da casa mas tem um … |
| listings._mstitle | {…} |
| listings._mstitle.en_US | Entire apartment (1) with reversible living room |
| listings._mstitle.pt_BR | Apartamento(1) inteiro com sala reversivel |
| listings._t_mainImageMeta | {…} |
| listings._t_mainImageMeta.url | https://bvm.stays.net/image/63dd83d5d4c4bd1f897c1b49 |
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
| listings.address.additional | AP1 |
| listings.address.city | Volta Redonda |
| listings.address.countryCode | BR |
| listings.address.region | São Geraldo |
| listings.address.state | Rio de Janeiro |
| listings.address.stateCode | RJ |
| listings.address.street | Capitão Benedito Lopes Bragança |
| listings.address.streetNumber | 313 |
| listings.address.zip | 27253-510 |
| listings.deff_curr | BRL |
| listings.groupIds | […] |
| listings.groupIds[] | 669e2ee3b36651a454a70713 |
| listings.id | PY02H |
| listings.instantBooking | true |
| listings.internalName | Celso AP 1 sem escada |
| listings.latLng | {…} |
| listings.latLng._f_lat | -22.5144376 |
| listings.latLng._f_lng | -44.0850892 |
| listings.listingCategories | […] |
| listings.listingCategories[] | vacationRental |
| listings.otaChannels | […] |
| listings.otaChannels[] | {…} |
| listings.otaChannels[].name | Airbnb |
| listings.status | active |
| listings.subtype | entire_home |

### clients
| path | exemplo |
|---|---|
| clients | {…} |
| clients._id | 694df1fd93c911ce177b2f93 |
| clients.clientSource | airbnb |
| clients.contactEmails | […] |
| clients.contactEmails[] | {…} |
| clients.contactEmails[].adr | varcan.642408@guest.booking.com |
| clients.contactEmails[].type | main |
| clients.creationDate | 2025-12-25 |
| clients.email | varcan.642408@guest.booking.com |
| clients.fName | Lucas Phelipe |
| clients.isUser | false |
| clients.kind | person |
| clients.lName | Almeida Preza |
| clients.name | Lucas Phelipe Almeida Preza |
| clients.nationality | BR |

### finance
| path | exemplo |
|---|---|
| finance | {…} |
| finance._id | 63d83d188e5afe3dd4648fda |
| finance.credit | {…} |
| finance.credit._mcval | {…} |
| finance.credit._mcval.BRL | 52537.21 |
| finance.dateRange | {…} |
| finance.dateRange.from | 2024-12-31 |
| finance.dateRange.to | 2025-12-26 |
| finance.debit | {…} |
| finance.debit._mcval | {…} |
| finance.debit._mcval.BRL | 26787 |
| finance.listings | […] |
| finance.listings[] | {…} |
| finance.listings[]._id | 6706800de5d759250265592e |
| finance.listings[].id | NO01I |
| finance.listings[].internalName | ❗NOVO Centro Rio Santa Luzia 776 - Sua Casa 04 |
| finance.name | SUA CASA RENDE MAIS |

## Union de paths (todos os domínios)
| path | exemplo |
|---|---|
| clients | {…} |
| clients._id | 694df1fd93c911ce177b2f93 |
| clients.clientSource | airbnb |
| clients.contactEmails | […] |
| clients.contactEmails[] | {…} |
| clients.contactEmails[].adr | varcan.642408@guest.booking.com |
| clients.contactEmails[].type | main |
| clients.creationDate | 2025-12-25 |
| clients.email | varcan.642408@guest.booking.com |
| clients.fName | Lucas Phelipe |
| clients.isUser | false |
| clients.kind | person |
| clients.lName | Almeida Preza |
| clients.name | Lucas Phelipe Almeida Preza |
| clients.nationality | BR |
| finance | {…} |
| finance._id | 63d83d188e5afe3dd4648fda |
| finance.credit | {…} |
| finance.credit._mcval | {…} |
| finance.credit._mcval.BRL | 52537.21 |
| finance.dateRange | {…} |
| finance.dateRange.from | 2024-12-31 |
| finance.dateRange.to | 2025-12-26 |
| finance.debit | {…} |
| finance.debit._mcval | {…} |
| finance.debit._mcval.BRL | 26787 |
| finance.listings | […] |
| finance.listings[] | {…} |
| finance.listings[]._id | 6706800de5d759250265592e |
| finance.listings[].id | NO01I |
| finance.listings[].internalName | ❗NOVO Centro Rio Santa Luzia 776 - Sua Casa 04 |
| finance.name | SUA CASA RENDE MAIS |
| listings | {…} |
| listings._f_bathrooms | 1 |
| listings._f_square | 65 |
| listings._i_beds | 2 |
| listings._i_maxGuests | 4 |
| listings._i_rooms | 1 |
| listings._id | 63dd7e20333d8b60be510f9c |
| listings._idmainImage | 63dd83d5d4c4bd1f897c1b49 |
| listings._idproperty | 63e16e00526be845bec4ff6b |
| listings._idpropertyType | 5ae04e1022261d03ab814d61 |
| listings._idtype | 5ab8f8a2f6b2dc2e97f97050 |
| listings._msdesc | {…} |
| listings._msdesc.en_US | Very close to the center and Av Amaral Peixoto but is also close to Shopping Novo and Unimed. Cool and airy place. Workbench for home office and 500MB internet. Parking for your car in front of the house. The apt is 1 bedroom but the living room can be used as a second bedroom as it has a sofa bed and door. Smoking is not allowed inside the house but there is a hallway right next to it. On foot… |
| listings._msdesc.pt_BR | <p>A casa fica muito bem localizada, mt próxima ao centro e Av Amaral Peixoto mas também está próxima do Shopping novo e unimed. Local fresco e arejado. Bancada para home office e internet 500MB.<br>Estacionamento para seu carro na frente da casa.<br>O apt é de 1 Qrt mas a sala pode ser utilizada como um segundo qrt pois tem sofá cama e porta.<br>Não é permitido fumar dentro da casa mas tem um … |
| listings._mstitle | {…} |
| listings._mstitle.en_US | Entire apartment (1) with reversible living room |
| listings._mstitle.pt_BR | Apartamento(1) inteiro com sala reversivel |
| listings._t_mainImageMeta | {…} |
| listings._t_mainImageMeta.url | https://bvm.stays.net/image/63dd83d5d4c4bd1f897c1b49 |
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
| listings.address.additional | AP1 |
| listings.address.city | Volta Redonda |
| listings.address.countryCode | BR |
| listings.address.region | São Geraldo |
| listings.address.state | Rio de Janeiro |
| listings.address.stateCode | RJ |
| listings.address.street | Capitão Benedito Lopes Bragança |
| listings.address.streetNumber | 313 |
| listings.address.zip | 27253-510 |
| listings.deff_curr | BRL |
| listings.groupIds | […] |
| listings.groupIds[] | 669e2ee3b36651a454a70713 |
| listings.id | PY02H |
| listings.instantBooking | true |
| listings.internalName | Celso AP 1 sem escada |
| listings.latLng | {…} |
| listings.latLng._f_lat | -22.5144376 |
| listings.latLng._f_lng | -44.0850892 |
| listings.listingCategories | […] |
| listings.listingCategories[] | vacationRental |
| listings.otaChannels | […] |
| listings.otaChannels[] | {…} |
| listings.otaChannels[].name | Airbnb |
| listings.status | active |
| listings.subtype | entire_home |
| reservations | {…} |
| reservations._id | 693bf2bd3a6d6379dd73a4c9 |
| reservations._idclient | 693bf2bb3a6d6379dd73a1b8 |
| reservations._idlisting | 67acf3502fe4d0496b8022eb |
| reservations.checkInDate | 2026-12-05 |
| reservations.checkInTime | 14:00 |
| reservations.checkOutDate | 2026-12-06 |
| reservations.checkOutTime | 12:00 |
| reservations.creationDate | 2025-12-12 |
| reservations.guests | 3 |
| reservations.guestsDetails | {…} |
| reservations.guestsDetails.adults | 3 |
| reservations.guestsDetails.children | 0 |
| reservations.guestsDetails.infants | 0 |
| reservations.id | RV02J |
| reservations.partner | {…} |
| reservations.partner._id | 5d1b5cbec62b271c78796479 |
| reservations.partner.commission | {…} |
| reservations.partner.commission._mcval | {…} |
| reservations.partner.commission._mcval.BRL | 55.58 |
| reservations.partner.commission.type | fixed |
| reservations.partner.name | API booking.com |
| reservations.partnerCode | 6342499387 |
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
| reservations.price.hostingDetails.fees[].name | Taxa de Limpeza * |
| reservations.reservationUrl | https://bvm.stays.net/i/account-overview/693bf2bb3a6d6379dd73a1b8?reserve=RV02J |
| reservations.stats | {…} |
| reservations.stats._f_totalPaid | 434.9 |
| reservations.type | booked |

## Reproduzir (scripts)
- `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/run-extract-staysnet-api-listings-direct.ps1 -MaxPages 5 -Limit 20`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/run-extract-staysnet-api-reservations-direct.ps1 -MaxPages 5 -Limit 20`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/run-extract-staysnet-api-clients-direct.ps1 -MaxPages 5 -Limit 20 -SampleDetails 2`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/run-extract-staysnet-api-finance-direct.ps1 -SampleOwnerDetails 2 -SampleReservationPayments 5`
- `pwsh -NoProfile -ExecutionPolicy Bypass -File ./scripts/run-generate-staysnet-api-schema-consolidated.ps1`

## Anexo — JSON completo (reservas selecionadas)
- Incluído para facilitar análise e descobrir campos adicionais.

### Reserva EV23J
```json
{
  "_id": "69388e7beb78f6b643d05ac2",
  "id": "EV23J",
  "creationDate": "2025-12-09",
  "checkInDate": "2026-01-01",
  "checkInTime": "15:00",
  "checkOutDate": "2026-01-08",
  "checkOutTime": "11:00",
  "_idlisting": "6908f6db973bd33da5d848b7",
  "_idclient": "69388e7aeb78f6b643d05aaa",
  "type": "booked",
  "operator": {
    "_id": "63d80d15136c1d1c0aa5114e",
    "name": "StaysBot"
  },
  "price": {
    "currency": "BRL",
    "_f_expected": 24343.67,
    "_f_total": 25230.55,
    "hostingDetails": {
      "fees": [
        {
          "name": "Taxa de Limpeza *",
          "_f_val": 400
        },
        {
          "name": "Taxa para impulsionamento de mídias sóciais",
          "_f_val": 486.88
        }
      ],
      "discounts": [],
      "_f_nightPrice": 24343.67,
      "_f_total": 25230.55
    },
    "extrasDetails": {
      "fees": [],
      "extraServices": [],
      "discounts": [],
      "_f_total": 0
    }
  },
  "stats": {
    "_f_totalPaid": 25230.55
  },
  "guests": 8,
  "guestsDetails": {
    "adults": 6,
    "children": 2,
    "infants": 0,
    "list": [
      {
        "type": "adult",
        "name": "Maga Alvarenga",
        "_idcontact": "69388e7aeb78f6b643d05aaa",
        "phones": [
          {
            "iso": "+595983155237",
            "hint": "AirBnB"
          }
        ],
        "primary": true
      },
      {
        "type": "adult",
        "name": "adult_1"
      },
      {
        "type": "adult",
        "name": "adult_2"
      },
      {
        "type": "adult",
        "name": "adult_3"
      },
      {
        "type": "adult",
        "name": "adult_4"
      },
      {
        "type": "adult",
        "name": "adult_5"
      },
      {
        "type": "child",
        "name": "child_1"
      },
      {
        "type": "child",
        "name": "child_2"
      }
    ]
  },
  "partner": {
    "_id": "5d1b5c5ec62b271c78796473",
    "name": "API airbnb",
    "commission": {
      "type": "fixed",
      "_mcval": {
        "BRL": 4595.19
      }
    }
  },
  "partnerCode": "HMERX23MAQ",
  "reservationUrl": "https://bvm.stays.net/i/account-overview/69388e7aeb78f6b643d05aaa?reserve=EV23J"
}
```
