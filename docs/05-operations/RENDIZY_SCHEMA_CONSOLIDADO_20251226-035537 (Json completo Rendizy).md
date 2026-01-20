# Rendizy — schema consolidado (observado via migrations + 1 sample row) — 20251226-035537

## Objetivo
- Gerar uma lista semelhante à do Stays para os campos do Rendizy (tabelas/colunas).
- Fonte: migrações SQL + um registro de amostra por tabela via Supabase REST (service role).

## Tabelas incluídas
- `properties`, `listings`, `guests`, `reservations`, `staysnet_config`, `staysnet_webhooks`, `staysnet_sync_log`, `staysnet_reservations_cache`, `staysnet_properties_cache`, `financeiro_lancamentos`, `financeiro_titulos`, `financeiro_linhas_extrato`, `financeiro_regras_conciliacao`

## guests
- Sample: **ok** (1 registro)
| path | type | exemplo |
|---|---|---|
| guests.CREATE | TABLE | (missing) |
| guests.created_at | timestamptz | 2025-12-15T00:26:54.97+00:00 |
| guests.document_number | TEXT | null |
| guests.email | text | limposeuapoficial@gmail.com |
| guests.id | uuid | 9aa96aa3-61d6-4c0e-9f63-dc910cfb4917 |
| guests.name | text | (missing) |
| guests.phone | text | 21995885999 |
| guests.source | text | direct |
| guests.updated_at | timestamptz | 2025-12-15T00:26:54.97+00:00 |
| guests.* |  |  |
| guests.address_city | (not in parsed migrations) | null |
| guests.address_complement | (not in parsed migrations) | null |
| guests.address_country | (not in parsed migrations) | null |
| guests.address_neighborhood | (not in parsed migrations) | null |
| guests.address_number | (not in parsed migrations) | null |
| guests.address_state | (not in parsed migrations) | null |
| guests.address_street | (not in parsed migrations) | null |
| guests.address_zip_code | (not in parsed migrations) | null |
| guests.birth_date | (not in parsed migrations) | null |
| guests.blacklist_reason | (not in parsed migrations) | null |
| guests.blacklisted_at | (not in parsed migrations) | null |
| guests.blacklisted_by | (not in parsed migrations) | null |
| guests.cpf | (not in parsed migrations) | null |
| guests.first_name | (not in parsed migrations) | Juliane |
| guests.full_name | (not in parsed migrations) | null |
| guests.is_blacklisted | (not in parsed migrations) | false |
| guests.language | (not in parsed migrations) | pt-BR |
| guests.last_name | (not in parsed migrations) | Milfont |
| guests.nationality | (not in parsed migrations) | null |
| guests.notes | (not in parsed migrations) | null |
| guests.organization_id | (not in parsed migrations) | 00000000-0000-0000-0000-000000000000 |
| guests.passport | (not in parsed migrations) | null |
| guests.preferences_early_check_in | (not in parsed migrations) | false |
| guests.preferences_high_floor | (not in parsed migrations) | false |
| guests.preferences_late_check_out | (not in parsed migrations) | false |
| guests.preferences_pets | (not in parsed migrations) | false |
| guests.preferences_quiet_floor | (not in parsed migrations) | false |
| guests.rg | (not in parsed migrations) | null |
| guests.stats_average_rating | (not in parsed migrations) | null |
| guests.stats_last_stay_date | (not in parsed migrations) | null |
| guests.stats_total_nights | (not in parsed migrations) | 0 |
| guests.stats_total_reservations | (not in parsed migrations) | 0 |
| guests.stats_total_spent | (not in parsed migrations) | 0 |
| guests.tags | (not in parsed migrations) | [] |

## listings
- Sample: **vazio** (0 registros retornados)
| path | type | exemplo |
|---|---|---|
| listings.advance_notice | INTEGER | (missing) |
| listings.average_rating | NUMERIC(3, 2) | (missing) |
| listings.CREATE | TABLE | (missing) |
| listings.created_at | TIMESTAMPTZ | (missing) |
| listings.description | JSONB | (missing) |
| listings.external_id | TEXT | (missing) |
| listings.external_url | TEXT | (missing) |
| listings.ical_url | TEXT | (missing) |
| listings.id | UUID | (missing) |
| listings.instant_book | BOOLEAN | (missing) |
| listings.last_sync_at | TIMESTAMPTZ | (missing) |
| listings.max_nights | INTEGER | (missing) |
| listings.min_nights | INTEGER | (missing) |
| listings.organization_id | UUID | (missing) |
| listings.platform | TEXT | (missing) |
| listings.pricing_adjustment | JSONB | (missing) |
| listings.property_id | TEXT | (missing) |
| listings.published_at | TIMESTAMPTZ | (missing) |
| listings.slug | TEXT | (missing) |
| listings.status | TEXT | (missing) |
| listings.sync_availability | BOOLEAN | (missing) |
| listings.sync_calendar | BOOLEAN | (missing) |
| listings.sync_pricing | BOOLEAN | (missing) |
| listings.title | JSONB | (missing) |
| listings.total_bookings | INTEGER | (missing) |
| listings.total_revenue | NUMERIC(10, 2) | (missing) |
| listings.total_views | INTEGER | (missing) |
| listings.updated_at | TIMESTAMPTZ | (missing) |

## properties
- Sample: **ok** (1 registro)
| path | type | exemplo |
|---|---|---|
| properties.address_city | text | Volta Redonda |
| properties.address_complement | text | AP 3 |
| properties.address_country | text | BR |
| properties.address_neighborhood | text | São Geraldo |
| properties.address_number | text | 313 |
| properties.address_state | text | RJ |
| properties.address_street | text | Capitão Benedito Lopes Bragança |
| properties.address_zip_code | text | 27253-510 |
| properties.amenities | jsonb | [] |
| properties.area | numeric | null |
| properties.bathrooms | numeric | 1 |
| properties.bedrooms | integer | 2 |
| properties.beds | integer | 5 |
| properties.code | text | QB04H |
| properties.color | text | null |
| properties.completed_steps | jsonb | [] |
| properties.completion_percentage | integer | 0 |
| properties.cover_photo | text | https://bvm.stays.net/image/63efec3c9f8732cd0e56e79f |
| properties.create | table | (missing) |
| properties.created_at | timestamptz | 2025-12-19T06:02:43.851+00:00 |
| properties.description | text | <p>Bem central mas tranquilo e familiar </p><p>Possível se locomover como quiser para toda a cidade, ônibus na porta, uber com facilidade e bem posicionado para toda a cidade. </p><p>Perto da colina, shopping park sul… |
| properties.external_ids | JSONB | (missing) |
| properties.folder | text | null |
| properties.id | text | 63e15fb0-bfed-47aa-9afd-071563e15fb0 |
| properties.is_active | boolean | true |
| properties.location_id | uuid | null |
| properties.max_guests | integer | 6 |
| properties.name | text | Apto(3) mt bem localizado, simples mas com tudo |
| properties.organization_id | uuid | 00000000-0000-0000-0000-000000000000 |
| properties.owner_id | uuid | 1925d183-b1e1-4d05-8247-cd7e6df62a11 |
| properties.photos | jsonb | ["https://bvm.stays.net/image/63efec3c9f8732cd0e56e79f"] |
| properties.platforms_airbnb_enabled | boolean | false |
| properties.platforms_airbnb_listing_id | text | null |
| properties.platforms_airbnb_sync_enabled | boolean | false |
| properties.platforms_booking_enabled | boolean | false |
| properties.platforms_booking_listing_id | text | null |
| properties.platforms_booking_sync_enabled | boolean | false |
| properties.platforms_decolar_enabled | boolean | false |
| properties.platforms_decolar_listing_id | text | null |
| properties.platforms_decolar_sync_enabled | boolean | false |
| properties.platforms_direct | boolean | true |
| properties.pricing_base_price | numeric | 0 |
| properties.pricing_biweekly_discount | numeric | 0 |
| properties.pricing_currency | text | BRL |
| properties.pricing_monthly_discount | numeric | 0 |
| properties.pricing_weekly_discount | numeric | 0 |
| properties.restrictions_advance_booking | integer | 0 |
| properties.restrictions_max_nights | integer | 365 |
| properties.restrictions_min_nights | integer | 1 |
| properties.restrictions_preparation_time | integer | 0 |
| properties.short_description | text | null |
| properties.status | text | active |
| properties.tags | jsonb | [] |
| properties.type | text | apartment |
| properties.updated_at | timestamptz | 2025-12-19T06:02:43.851+00:00 |
| properties.wizard_data | jsonb | null |

## reservations
- Sample: **ok** (1 registro)
| path | type | exemplo |
|---|---|---|
| reservations.actual_check_in | TIMESTAMPTZ | null |
| reservations.actual_check_out | TIMESTAMPTZ | null |
| reservations.cancellation_reason | TEXT | null |
| reservations.cancelled_at | TIMESTAMPTZ | null |
| reservations.cancelled_by | UUID | null |
| reservations.confirmed_at | TIMESTAMPTZ | 2025-12-25T23:38:49.613+00:00 |
| reservations.CREATE | TABLE | (missing) |
| reservations.created_at | TIMESTAMPTZ | 2025-12-25T17:26:02.501815+00:00 |
| reservations.created_by | UUID | 00000000-0000-0000-0000-000000000002 |
| reservations.external_id | TEXT | 677db72d44bf0257e2b1aef5 |
| reservations.external_url | TEXT | https://bvm.stays.net/i/account-overview/677db72d44bf0257e2b1aebc?reserve=RF21I |
| reservations.full_name | TEXT | (missing) |
| reservations.guest_id | UUID | ae5a7de1-b0e6-4031-955e-ba6e7d5642c2 |
| reservations.guests_adults | INTEGER | 1 |
| reservations.guests_children | INTEGER | 0 |
| reservations.guests_infants | INTEGER | 0 |
| reservations.guests_pets | INTEGER | 0 |
| reservations.guests_total | INTEGER | 1 |
| reservations.id | TEXT | 677db72d44bf0257e2b1aef5 |
| reservations.internal_comments | TEXT | null |
| reservations.nights | INTEGER | 3 |
| reservations.notes | TEXT | null |
| reservations.organization_id | UUID | 00000000-0000-0000-0000-000000000000 |
| reservations.payment_method | TEXT | null |
| reservations.payment_paid_at | TIMESTAMPTZ | null |
| reservations.payment_refunded_at | TIMESTAMPTZ | null |
| reservations.payment_status | TEXT | pending |
| reservations.payment_transaction_id | TEXT | null |
| reservations.platform | TEXT | other |
| reservations.pricing_applied_tier | TEXT | null |
| reservations.pricing_base_total | NUMERIC(10, 2) | 0 |
| reservations.pricing_cleaning_fee | NUMERIC(10, 2) | 0 |
| reservations.pricing_currency | TEXT | BRL |
| reservations.pricing_discount | NUMERIC(10, 2) | 0 |
| reservations.pricing_price_per_night | NUMERIC(10, 2) | 0 |
| reservations.pricing_service_fee | NUMERIC(10, 2) | 0 |
| reservations.pricing_taxes | NUMERIC(10, 2) | 0 |
| reservations.pricing_total | NUMERIC(10, 2) | 0 |
| reservations.property_id | UUID | 92d92354-0eb8-4253-9c58-623688430bbc |
| reservations.source_created_at | TIMESTAMPTZ | null |
| reservations.special_requests | TEXT | null |
| reservations.status | TEXT | confirmed |
| reservations.staysnet_raw | JSONB | {"id":"RF21I","_id":"677db72d44bf0257e2b1aef5","type":"booked","price":{"_f_total":630.15,"currency":"BRL","_f_expected":490.15,"extrasDetails":{"fees":[],"_f_total":0,"discounts":[],"extraServices":[]},"hostingDetail… |
| reservations.updated_at | TIMESTAMPTZ | 2025-12-25T23:38:49.634242+00:00 |
| reservations.* |  |  |
| reservations.check_in | (not in parsed migrations) | 2025-01-12 |
| reservations.check_in_time | (not in parsed migrations) | 14:00:00 |
| reservations.check_out | (not in parsed migrations) | 2025-01-15 |
| reservations.check_out_time | (not in parsed migrations) | 12:00:00 |

## staysnet_config
- Sample: **ok** (1 registro)
| path | type | exemplo |
|---|---|---|
| staysnet_config.account_name | TEXT | null |
| staysnet_config.api_key | TEXT | a5146970 |
| staysnet_config.api_secret | TEXT | bfcf4daf |
| staysnet_config.base_url | TEXT | https://stays.net/external-api/external/v1 |
| staysnet_config.CREATE | TABLE | (missing) |
| staysnet_config.created_at | TIMESTAMPTZ | 2025-11-18T02:41:41.940429+00:00 |
| staysnet_config.created_by | TEXT | null |
| staysnet_config.enabled | BOOLEAN | false |
| staysnet_config.id | UUID | 6032ab9a-d74e-4386-aaef-73f80645752a |
| staysnet_config.last_sync | TIMESTAMPTZ | 2025-11-16T01:16:59.753+00:00 |
| staysnet_config.notification_webhook_url | TEXT | null |
| staysnet_config.organization_id | TEXT | 7b32e26f-29aa-491a-a03d-dca2d947aa26 |
| staysnet_config.scope | TEXT | global |
| staysnet_config.updated_at | TIMESTAMPTZ | 2025-11-18T02:54:26.728107+00:00 |
| staysnet_config.updated_by | TEXT | null |

## staysnet_properties_cache
- Sample: **vazio** (0 registros retornados)
| path | type | exemplo |
|---|---|---|
| staysnet_properties_cache.CREATE | TABLE | (missing) |
| staysnet_properties_cache.id | UUID | (missing) |
| staysnet_properties_cache.last_updated_at | TIMESTAMPTZ | (missing) |
| staysnet_properties_cache.organization_id | TEXT | (missing) |
| staysnet_properties_cache.property_data | JSONB | (missing) |
| staysnet_properties_cache.staysnet_property_id | TEXT | (missing) |
| staysnet_properties_cache.synced_at | TIMESTAMPTZ | (missing) |

## staysnet_reservations_cache
- Sample: **vazio** (0 registros retornados)
| path | type | exemplo |
|---|---|---|
| staysnet_reservations_cache.CREATE | TABLE | (missing) |
| staysnet_reservations_cache.id | UUID | (missing) |
| staysnet_reservations_cache.last_updated_at | TIMESTAMPTZ | (missing) |
| staysnet_reservations_cache.organization_id | TEXT | (missing) |
| staysnet_reservations_cache.reservation_data | JSONB | (missing) |
| staysnet_reservations_cache.staysnet_reservation_id | TEXT | (missing) |
| staysnet_reservations_cache.synced_at | TIMESTAMPTZ | (missing) |

## staysnet_sync_log
- Sample: **vazio** (0 registros retornados)
| path | type | exemplo |
|---|---|---|
| staysnet_sync_log.completed_at | TIMESTAMPTZ | (missing) |
| staysnet_sync_log.CREATE | TABLE | (missing) |
| staysnet_sync_log.error_message | TEXT | (missing) |
| staysnet_sync_log.id | UUID | (missing) |
| staysnet_sync_log.items_created | INTEGER | (missing) |
| staysnet_sync_log.items_failed | INTEGER | (missing) |
| staysnet_sync_log.items_synced | INTEGER | (missing) |
| staysnet_sync_log.items_updated | INTEGER | (missing) |
| staysnet_sync_log.metadata | JSONB | (missing) |
| staysnet_sync_log.organization_id | TEXT | (missing) |
| staysnet_sync_log.started_at | TIMESTAMPTZ | (missing) |
| staysnet_sync_log.status | TEXT | (missing) |
| staysnet_sync_log.sync_type | TEXT | (missing) |

## staysnet_webhooks
- Sample: **ok** (1 registro)
| path | type | exemplo |
|---|---|---|
| staysnet_webhooks.action | TEXT | client.created |
| staysnet_webhooks.CREATE | TABLE | (missing) |
| staysnet_webhooks.error_message | TEXT | null |
| staysnet_webhooks.id | UUID | 9d13b966-5b95-49c0-800f-91443005412e |
| staysnet_webhooks.metadata | JSONB | {"headers":{"user-agent":"got (https://github.com/sindresorhus/got)","x-stays-client-id":"a5146970","x-stays-signature":"Vvg5SyIZJ2pTe/mrbk2CactWXLNIcq1uKSiUv+xWFdMa75srlFojTgNQsNo8cL5EbDeTHqzsAKSslmcyF1U2+ahyjAtPtCJj… |
| staysnet_webhooks.organization_id | TEXT | 00000000-0000-0000-0000-000000000000 |
| staysnet_webhooks.payload | JSONB | {"_id":"694d8c3c8a6deac1946f36ef","kind":"person","name":"Luan Bispo","fName":"Luan","lName":"Bispo","isUser":false,"phones":[{"iso":"+5511930049224","hint":"AirBnB"}],"prefLang":"pt_BR","clientSource":"airbnb","creat… |
| staysnet_webhooks.processed | BOOLEAN | true |
| staysnet_webhooks.processed_at | TIMESTAMPTZ | 2025-12-25T19:12:00.586+00:00 |
| staysnet_webhooks.received_at | TIMESTAMPTZ | 2025-12-25T19:11:03.55+00:00 |
