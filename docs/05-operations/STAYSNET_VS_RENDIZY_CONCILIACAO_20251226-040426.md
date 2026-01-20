# Stays vs Rendizy — conciliação de campos (com dados reais) — 20251226-040426

## Objetivo
- Colocar **campos Stays** e **campos Rendizy** lado a lado, com exemplos reais, para decidir o que vira coluna no Rendizy e o que precisa ser criado.
- Onde houver semelhança, o documento aproxima automaticamente (heurística).

## Fontes
- Stays: `docs/05-operations/STAYSNET_API_SCHEMA_CONSOLIDADO_20251226-035311 (Json completo Stays).md`
- Rendizy: `docs/05-operations/RENDIZY_SCHEMA_CONSOLIDADO_20251226-035608 (Json completo Rendizy).md`

## Legenda
- **EXISTS**: coluna existe no Rendizy (mesmo que sample esteja vazio).
- **MISSING**: não existe coluna equivalente nas tabelas candidatas.
- **REVIEW**: match fraco/ambíguo; decisão manual recomendada.

## reservations
- Tabelas candidatas no Rendizy: `reservations`

| stays.path | stays.exemplo | rendizy.candidato | rendizy.type | rendizy.exemplo | status | sugestão (se faltar) |
|---|---|---|---|---|---|---|
| reservations._id | 693bf2bd3a6d6379dd73a4c9 | reservations.external_id | TEXT | 677db72d44bf0257e2b1aef5 | EXISTS |  |
| reservations._idclient | 693bf2bb3a6d6379dd73a1b8 | reservations.staysnet_client_id | TEXT |  | MISSING | criar coluna derivada (reservations.staysnet_client_id) + também manter staysnet_raw |
| reservations._idlisting | 67acf3502fe4d0496b8022eb | reservations.staysnet_listing_id | TEXT |  | MISSING | criar coluna derivada (reservations.staysnet_listing_id) + também manter staysnet_raw |
| reservations.checkInDate | 2026-12-05 | reservations.check_in | (not in parsed migrations) | 2025-01-12 | EXISTS |  |
| reservations.checkInTime | 14:00 | reservations.check_in_time | (not in parsed migrations) | 14:00:00 | EXISTS |  |
| reservations.checkOutDate | 2026-12-06 | reservations.check_out | (not in parsed migrations) | 2025-01-15 | EXISTS |  |
| reservations.checkOutTime | 12:00 | reservations.check_out_time | (not in parsed migrations) | 12:00:00 | EXISTS |  |
| reservations.creationDate | 2025-12-12 | reservations.created_at | TIMESTAMPTZ | 2025-12-25T17:26:02.501815+00:00 | EXISTS |  |
| reservations.guests | 3 | reservations.guests_total | INTEGER | 1 | EXISTS |  |
| reservations.guestsDetails | {…} | reservations.guests_adults | INTEGER | 1 | REVIEW |  |
| reservations.guestsDetails.adults | 3 | reservations.guests_adults | INTEGER | 1 | EXISTS |  |
| reservations.guestsDetails.children | 0 | reservations.guests_children | INTEGER | 0 | EXISTS |  |
| reservations.guestsDetails.infants | 0 | reservations.guests_infants | INTEGER | 0 | EXISTS |  |
| reservations.id | RV02J | reservations.staysnet_reservation_code | TEXT |  | MISSING | criar coluna derivada (reservations.staysnet_reservation_code) + manter external_id como Stays _id |
| reservations.partner | {…} |  |  |  | MISSING | reservations.staysnet_raw — padrão: preservar no JSONB raw |
| reservations.partner._id | 5d1b5cbec62b271c78796479 | reservations.staysnet_partner_id | TEXT |  | MISSING | criar coluna derivada (reservations.staysnet_partner_id) + também manter staysnet_raw |
| reservations.partner.commission | {…} |  |  |  | MISSING | reservations.staysnet_raw — padrão: preservar no JSONB raw |
| reservations.partner.commission._mcval | {…} |  |  |  | MISSING | reservations.staysnet_raw — padrão: preservar no JSONB raw |
| reservations.partner.commission._mcval.BRL | 55.58 |  |  |  | MISSING | reservations.staysnet_raw — padrão: preservar no JSONB raw |
| reservations.partner.commission.type | fixed |  |  |  | MISSING | reservations.staysnet_raw — padrão: preservar no JSONB raw |
| reservations.partner.name | API booking.com |  |  |  | MISSING | reservations.staysnet_raw — padrão: preservar no JSONB raw |
| reservations.partnerCode | 6342499387 | reservations.staysnet_partner_code | TEXT |  | MISSING | criar coluna derivada (reservations.staysnet_partner_code) + também manter staysnet_raw |
| reservations.price | {…} |  |  |  | MISSING | reservations.pricing_* — mapear para colunas pricing_ existentes quando possível; resto fica no staysnet_raw |
| reservations.price._f_expected | 367.55 | reservations.pricing_base_total | NUMERIC(10, 2) | 0 | EXISTS |  |
| reservations.price._f_total | 434.9 | reservations.pricing_total | NUMERIC(10, 2) | 0 | EXISTS |  |
| reservations.price.currency | BRL | reservations.pricing_currency | TEXT | BRL | EXISTS |  |
| reservations.price.extrasDetails | {…} |  |  |  | MISSING | reservations.pricing_* — mapear para colunas pricing_ existentes quando possível; resto fica no staysnet_raw |
| reservations.price.extrasDetails._f_total | 0 |  |  |  | MISSING | reservations.pricing_* — mapear para colunas pricing_ existentes quando possível; resto fica no staysnet_raw |
| reservations.price.extrasDetails.discounts | […] |  |  |  | MISSING | reservations.pricing_* — mapear para colunas pricing_ existentes quando possível; resto fica no staysnet_raw |
| reservations.price.extrasDetails.extraServices | […] |  |  |  | MISSING | reservations.pricing_* — mapear para colunas pricing_ existentes quando possível; resto fica no staysnet_raw |
| reservations.price.extrasDetails.fees | […] |  |  |  | MISSING | reservations.pricing_* — mapear para colunas pricing_ existentes quando possível; resto fica no staysnet_raw |
| reservations.price.hostingDetails | {…} |  |  |  | MISSING | reservations.pricing_* — mapear para colunas pricing_ existentes quando possível; resto fica no staysnet_raw |
| reservations.price.hostingDetails._f_nightPrice | 317.55 | reservations.pricing_price_per_night | NUMERIC(10, 2) | 0 | EXISTS |  |
| reservations.price.hostingDetails._f_total | 434.9 |  |  |  | MISSING | reservations.pricing_* — mapear para colunas pricing_ existentes quando possível; resto fica no staysnet_raw |
| reservations.price.hostingDetails.discounts | […] |  |  |  | MISSING | reservations.pricing_* — mapear para colunas pricing_ existentes quando possível; resto fica no staysnet_raw |
| reservations.price.hostingDetails.fees | […] |  |  |  | MISSING | reservations.pricing_* — mapear para colunas pricing_ existentes quando possível; resto fica no staysnet_raw |
| reservations.price.hostingDetails.fees[]._f_val | 60 |  |  |  | MISSING | reservations.pricing_* — mapear para colunas pricing_ existentes quando possível; resto fica no staysnet_raw |
| reservations.price.hostingDetails.fees[].name | Taxa de Limpeza * |  |  |  | MISSING | reservations.pricing_* — mapear para colunas pricing_ existentes quando possível; resto fica no staysnet_raw |
| reservations.reservationUrl | https://bvm.stays.net/i/account-overview/693bf2bb3a6d6379dd73a1b8?reserve=RV02J |  |  |  | MISSING | reservations.staysnet_raw — padrão: preservar no JSONB raw |
| reservations.stats | {…} |  |  |  | MISSING | reservations.pricing_* — mapear para colunas pricing_ existentes quando possível; resto fica no staysnet_raw |
| reservations.stats._f_totalPaid | 434.9 | reservations.pricing_total | NUMERIC(10, 2) | 0 | EXISTS |  |
| reservations.type | booked |  |  |  | MISSING | reservations.staysnet_raw — padrão: preservar no JSONB raw |

## listings
- Tabelas candidatas no Rendizy: `properties`, `listings`

| stays.path | stays.exemplo | rendizy.candidato | rendizy.type | rendizy.exemplo | status | sugestão (se faltar) |
|---|---|---|---|---|---|---|
| listings._f_bathrooms | 1 | properties.bathrooms | numeric | 1 | REVIEW |  |
| listings._f_square | 65 |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._i_beds | 2 | properties.beds | integer | 5 | REVIEW |  |
| listings._i_maxGuests | 4 | properties.max_guests | integer | 6 | EXISTS |  |
| listings._i_rooms | 1 |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._id | 63dd7e20333d8b60be510f9c | properties.external_ids | JSONB |  | REVIEW | não mapear para properties.id (UUID). Usar external_ids->>'staysnet_listing_id' (id do listing na Stays; deve bater com reservations._idlisting) |
| listings._idmainImage | 63dd83d5d4c4bd1f897c1b49 |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._idproperty | 63e16e00526be845bec4ff6b | properties.external_ids | JSONB |  | REVIEW | guardar como external_ids->>'staysnet_property_id' (id do property por trás do listing; quando existir também pode vir em listings._t_propertyMeta._id) |
| listings._idpropertyType | 5ae04e1022261d03ab814d61 | properties.type | text | apartment | REVIEW |  |
| listings._idtype | 5ab8f8a2f6b2dc2e97f97050 |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._msdesc | {…} |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._msdesc.en_US | Very close to the center and Av Amaral Peixoto but is also close to Shopping Novo and Unimed. Cool and airy place. Workbench for home office and 500MB internet. Parking for your car in front of the house. The apt is 1 bedroom but the living room can be used as a second bedroom as it has a sofa bed and door. Smoking is not allowed inside the house but there is a hallway right next to it. On foot… |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._msdesc.pt_BR | <p>A casa fica muito bem localizada, mt próxima ao centro e Av Amaral Peixoto mas também está próxima do Shopping novo e unimed. Local fresco e arejado. Bancada para home office e internet 500MB.<br>Estacionamento para seu carro na frente da casa.<br>O apt é de 1 Qrt mas a sala pode ser utilizada como um segundo qrt pois tem sofá cama e porta.<br>Não é permitido fumar dentro da casa mas tem um … |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._mstitle | {…} |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._mstitle.en_US | Entire apartment (1) with reversible living room |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._mstitle.pt_BR | Apartamento(1) inteiro com sala reversivel |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_mainImageMeta | {…} |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_mainImageMeta.url | https://bvm.stays.net/image/63dd83d5d4c4bd1f897c1b49 |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_propertyTypeMeta | {…} |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_propertyTypeMeta._mstitle | {…} |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_propertyTypeMeta._mstitle.de_DE | Ferienwohnung |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_propertyTypeMeta._mstitle.el_GR | (empty) |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_propertyTypeMeta._mstitle.en_US | Apartment |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_propertyTypeMeta._mstitle.es_ES | Departamento |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_propertyTypeMeta._mstitle.fr_FR | (empty) |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_propertyTypeMeta._mstitle.it_IT | (empty) |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_propertyTypeMeta._mstitle.pt_BR | Apartamento |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_propertyTypeMeta._mstitle.pt_PT | Apartamento |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_propertyTypeMeta._mstitle.ru_RU | (empty) |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_propertyTypeMeta._mstitle.sv_SE | (empty) |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_typeMeta | {…} |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_typeMeta._mstitle | {…} |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_typeMeta._mstitle.de_DE | Ferienwohnung |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_typeMeta._mstitle.el_GR | (empty) |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_typeMeta._mstitle.en_US | Apartment |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_typeMeta._mstitle.es_ES | Departamento |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_typeMeta._mstitle.fr_FR | (empty) |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_typeMeta._mstitle.it_IT | (empty) |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_typeMeta._mstitle.pt_BR | Apartamento |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_typeMeta._mstitle.pt_PT | Apartamento |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_typeMeta._mstitle.ru_RU | (empty) |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings._t_typeMeta._mstitle.sv_SE | (empty) |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings.address | {…} | properties.address_city | text | Volta Redonda | REVIEW |  |
| listings.address.additional | AP1 |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings.address.city | Volta Redonda | properties.address_city | text | Volta Redonda | EXISTS |  |
| listings.address.countryCode | BR | properties.address_country | text | BR | EXISTS |  |
| listings.address.region | São Geraldo |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings.address.state | Rio de Janeiro | properties.address_state | text | RJ | EXISTS |  |
| listings.address.stateCode | RJ | properties.address_state | text | RJ | EXISTS |  |
| listings.address.street | Capitão Benedito Lopes Bragança | properties.address_street | text | Capitão Benedito Lopes Bragança | EXISTS |  |
| listings.address.streetNumber | 313 | properties.address_number | text | 313 | EXISTS |  |
| listings.address.zip | 27253-510 | properties.address_zip_code | text | 27253-510 | EXISTS |  |
| listings.deff_curr | BRL |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings.groupIds | […] |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings.id | PY02H | properties.external_ids | JSONB |  | REVIEW | código curto do listing (não confundir com listings._id). Guardar como external_ids->>'staysnet_listing_code' |
| listings.instantBooking | true |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings.internalName | Celso AP 1 sem escada | properties.name | text | Apto(3) mt bem localizado, simples mas com tudo | REVIEW |  |
| listings.latLng | {…} |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings.latLng._f_lat | -22.5144376 |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings.latLng._f_lng | -44.0850892 |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings.listingCategories | […] |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings.otaChannels | […] |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings.otaChannels[].name | Airbnb |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |
| listings.status | active | properties.status | text | active | EXISTS |  |
| listings.subtype | entire_home |  |  |  | MISSING | properties.* / listings.* — listings Stays pode virar properties (unidade) e/ou listings (plataforma) no Rendizy; decidir modelo |

## clients
- Tabelas candidatas no Rendizy: `guests`

| stays.path | stays.exemplo | rendizy.candidato | rendizy.type | rendizy.exemplo | status | sugestão (se faltar) |
|---|---|---|---|---|---|---|
| clients._id | 694df1fd93c911ce177b2f93 | guests.staysnet_client_id | TEXT |  | MISSING | criar coluna (guests.staysnet_client_id) e deduplicar por ela quando existir |
| clients.clientSource | airbnb | guests.source | text | direct | REVIEW |  |
| clients.contactEmails | […] |  |  |  | MISSING | guests.* — clientes Stays ≈ guests Rendizy; campos extras podem ir em guests (ou guests.staysnet_raw se criar) |
| clients.contactEmails[].adr | varcan.642408@guest.booking.com |  |  |  | MISSING | guests.* — clientes Stays ≈ guests Rendizy; campos extras podem ir em guests (ou guests.staysnet_raw se criar) |
| clients.contactEmails[].type | main |  |  |  | MISSING | guests.* — clientes Stays ≈ guests Rendizy; campos extras podem ir em guests (ou guests.staysnet_raw se criar) |
| clients.creationDate | 2025-12-25 |  |  |  | MISSING | guests.* — clientes Stays ≈ guests Rendizy; campos extras podem ir em guests (ou guests.staysnet_raw se criar) |
| clients.email | varcan.642408@guest.booking.com | guests.email | text | limposeuapoficial@gmail.com | EXISTS |  |
| clients.fName | Lucas Phelipe | guests.name | text | (missing) | REVIEW |  |
| clients.isUser | false |  |  |  | MISSING | guests.* — clientes Stays ≈ guests Rendizy; campos extras podem ir em guests (ou guests.staysnet_raw se criar) |
| clients.kind | person |  |  |  | MISSING | guests.* — clientes Stays ≈ guests Rendizy; campos extras podem ir em guests (ou guests.staysnet_raw se criar) |
| clients.lName | Almeida Preza | guests.name | text | (missing) | REVIEW |  |
| clients.name | Lucas Phelipe Almeida Preza | guests.name | text | (missing) | EXISTS |  |
| clients.nationality | BR | guests.nationality | (not in parsed migrations) | null | EXISTS |  |

## finance
- Tabelas candidatas no Rendizy: `financeiro_lancamentos`, `financeiro_titulos`, `financeiro_linhas_extrato`, `financeiro_regras_conciliacao`

| stays.path | stays.exemplo | rendizy.candidato | rendizy.type | rendizy.exemplo | status | sugestão (se faltar) |
|---|---|---|---|---|---|---|
| finance._id | 63d83d188e5afe3dd4648fda | financeiro_titulos.staysnet_owner_id | TEXT |  | MISSING | criar coluna(s) staysnet_* nos financeiros (ou JSONB raw) para conciliação segura |
| finance.credit | {…} |  |  |  | MISSING | financeiro_* — mapear em financeiro_lancamentos/financeiro_titulos etc; campos não mapeáveis podem pedir JSONB raw |
| finance.credit._mcval | {…} |  |  |  | MISSING | financeiro_* — mapear em financeiro_lancamentos/financeiro_titulos etc; campos não mapeáveis podem pedir JSONB raw |
| finance.credit._mcval.BRL | 52537.21 |  |  |  | MISSING | financeiro_* — mapear em financeiro_lancamentos/financeiro_titulos etc; campos não mapeáveis podem pedir JSONB raw |
| finance.dateRange | {…} |  |  |  | MISSING | financeiro_* — mapear em financeiro_lancamentos/financeiro_titulos etc; campos não mapeáveis podem pedir JSONB raw |
| finance.dateRange.from | 2024-12-31 |  |  |  | MISSING | financeiro_* — mapear em financeiro_lancamentos/financeiro_titulos etc; campos não mapeáveis podem pedir JSONB raw |
| finance.dateRange.to | 2025-12-26 |  |  |  | MISSING | financeiro_* — mapear em financeiro_lancamentos/financeiro_titulos etc; campos não mapeáveis podem pedir JSONB raw |
| finance.debit | {…} |  |  |  | MISSING | financeiro_* — mapear em financeiro_lancamentos/financeiro_titulos etc; campos não mapeáveis podem pedir JSONB raw |
| finance.debit._mcval | {…} |  |  |  | MISSING | financeiro_* — mapear em financeiro_lancamentos/financeiro_titulos etc; campos não mapeáveis podem pedir JSONB raw |
| finance.debit._mcval.BRL | 26787 |  |  |  | MISSING | financeiro_* — mapear em financeiro_lancamentos/financeiro_titulos etc; campos não mapeáveis podem pedir JSONB raw |
| finance.listings | […] |  |  |  | MISSING | financeiro_* — mapear em financeiro_lancamentos/financeiro_titulos etc; campos não mapeáveis podem pedir JSONB raw |
| finance.listings[]._id | 6706800de5d759250265592e | financeiro_titulos.id | UUID | (missing) | REVIEW |  |
| finance.listings[].id | NO01I | financeiro_titulos.id | UUID | (missing) | REVIEW |  |
| finance.listings[].internalName | ❗NOVO Centro Rio Santa Luzia 776 - Sua Casa 04 |  |  |  | MISSING | financeiro_* — mapear em financeiro_lancamentos/financeiro_titulos etc; campos não mapeáveis podem pedir JSONB raw |
| finance.name | SUA CASA RENDE MAIS |  |  |  | MISSING | financeiro_* — mapear em financeiro_lancamentos/financeiro_titulos etc; campos não mapeáveis podem pedir JSONB raw |
