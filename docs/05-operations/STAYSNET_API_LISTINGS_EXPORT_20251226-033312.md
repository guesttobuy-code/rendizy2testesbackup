# Stays API — listings export (direto) — 20251226-033312

## Objetivo
- Extrair direto do endpoint de listagens (fonte de verdade) para validar campos reais de “imóveis/anúncios”.

## Como foi extraído
- Endpoint: `/content/listings`
- Base URL: `https://bvm.stays.net/external/v1`
- Filtros: status=`(vazio)`, groupId=`(vazio)`, rel=`(vazio)`, propertyId=`(vazio)`
- Paginação: `limit=20` (doc: max 20), `maxPages=2`, `startSkip=0`

## Saída
- Raw JSON: `_reports/staysnet-api-exports/listings-20251226-033312/listings_raw.json`
- Meta: `_reports/staysnet-api-exports/listings-20251226-033312/meta.json`

## Resultado
- Fetched: **40**
- next.skip: **40**
- next.hasMore: **true**

## Campos observados (alto nível)
- Top-level keys (1ª listing): `_f_bathrooms`, `_f_square`, `_i_beds`, `_i_maxGuests`, `_i_rooms`, `_id`, `_idmainImage`, `_idpropertyType`, `_idtype`, `_msdesc`, `_mstitle`, `_t_mainImageMeta`, `_t_propertyTypeMeta`, `_t_typeMeta`, `address`, `deff_curr`, `groupIds`, `id`, `instantBooking`, `internalName`, `latLng`, `listingCategories`, `otaChannels`, `status`, `subtype`

## Enum candidates (observado)

### status
- active: 40

### rel
- (vazio): 40

### deff_curr
- BRL: 40

### _idtype
- 5fa4093173e2c31498fcf0f7: 14
- 5ab8f8a2f6b2dc2e97f97050: 10
- 5ab8f8a2f6b2dc2e97f9704d: 5
- 5ab8f8a2f6b2dc2e97f9704f: 4
- 5ab8f8a2f6b2dc2e97f9704a: 3
- 5ad9b01422261d6cda27d3e0: 2
- 5ab8f8a2f6b2dc2e97f97056: 1
- 5ab8f8a2f6b2dc2e97f9704e: 1

## Paths observados (amostra)
| path |
|---|
| (root) |
| _f_bathrooms |
| _f_square |
| _i_beds |
| _i_maxGuests |
| _i_rooms |
| _id |
| _idmainImage |
| _idproperty |
| _idpropertyType |
| _idtype |
| _msdesc |
| _msdesc.en_US |
| _msdesc.pt_BR |
| _mstitle |
| _mstitle.en_US |
| _mstitle.pt_BR |
| _t_mainImageMeta |
| _t_mainImageMeta.url |
| _t_propertyTypeMeta |
| _t_propertyTypeMeta._mstitle |
| _t_propertyTypeMeta._mstitle.de_DE |
| _t_propertyTypeMeta._mstitle.el_GR |
| _t_propertyTypeMeta._mstitle.en_US |
| _t_propertyTypeMeta._mstitle.es_ES |
| _t_propertyTypeMeta._mstitle.fr_FR |
| _t_propertyTypeMeta._mstitle.it_IT |
| _t_propertyTypeMeta._mstitle.pt_BR |
| _t_propertyTypeMeta._mstitle.pt_PT |
| _t_propertyTypeMeta._mstitle.ru_RU |
| _t_propertyTypeMeta._mstitle.sv_SE |
| _t_typeMeta |
| _t_typeMeta._mstitle |
| _t_typeMeta._mstitle.de_DE |
| _t_typeMeta._mstitle.el_GR |
| _t_typeMeta._mstitle.en_US |
| _t_typeMeta._mstitle.es_ES |
| _t_typeMeta._mstitle.fr_FR |
| _t_typeMeta._mstitle.it_IT |
| _t_typeMeta._mstitle.pt_BR |
| _t_typeMeta._mstitle.pt_PT |
| _t_typeMeta._mstitle.ru_RU |
| _t_typeMeta._mstitle.sv_SE |
| address |
| address.additional |
| address.city |
| address.countryCode |
| address.region |
| address.state |
| address.stateCode |
| address.street |
| address.streetNumber |
| address.zip |
| deff_curr |
| groupIds |
| groupIds[] |
| id |
| instantBooking |
| internalName |
| latLng |
| latLng._f_lat |
| latLng._f_lng |
| listingCategories |
| listingCategories[] |
| otaChannels |
| otaChannels[] |
| otaChannels[].name |
| status |
| subtype |

## Nota de segurança
- O arquivo raw pode conter dados sensíveis (endereço, etc). Evite commitar esses exports; use apenas localmente para auditoria/mapeamento.