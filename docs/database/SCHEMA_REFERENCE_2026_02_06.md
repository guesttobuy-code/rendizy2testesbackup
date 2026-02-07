# Schema Reference - Rendizy Database
> Gerado em: 2026-02-06
> Total de tabelas: 203

## Índice por Domínio

### 🏠 Propriedades & Acomodações
| Tabela | Descrição |
|--------|-----------|
| `properties` | Propriedades principais |
| `properties_drafts` | Rascunhos de propriedades |
| `property_rooms` | Quartos das propriedades |
| `property_channel_settings` | Configurações por canal |
| `property_cancellation_penalties` | Penalidades de cancelamento |
| `property_ota_extensions` | Extensões OTA |
| `rooms` | Quartos (legacy?) |
| `room_types` | Tipos de quarto |
| `room_photos` | Fotos dos quartos |
| `beds` | Camas |
| `bed_types` | Tipos de cama |
| `accommodation_rules` | Regras de acomodação |
| `locations` | Localizações |
| `geographic_regions` | Regiões geográficas |

### 📅 Reservas & Hóspedes
| Tabela | Descrição |
|--------|-----------|
| `reservations` | Reservas principais |
| `reservation_rooms` | Quartos por reserva (multi-room) |
| `reservation_room_history` | Histórico quartos reserva |
| `reservation_history` | Histórico de alterações |
| `reservation_additional_guests` | Hóspedes adicionais |
| `reservation_cancellations` | Cancelamentos |
| `reservation_deposits` | Depósitos |
| `reservation_pricing_breakdown` | Breakdown de preços |
| `guests` | Cadastro de hóspedes |
| `guest_users` | Usuários hóspedes |

### 💰 Precificação & Rate Plans
| Tabela | Descrição |
|--------|-----------|
| `rate_plans` | Planos de tarifa |
| `rate_plan_availability` | Disponibilidade |
| `rate_plan_pricing_overrides` | Sobrescritas de preço |
| `pricing_settings` | Configurações de preço |
| `calendar_pricing_rules` | Regras de calendário |
| `custom_prices` | Preços customizados |
| `custom_min_nights` | Mínimo de noites custom |
| `cancellation_policy_templates` | Templates de política |

### 💳 Pagamentos & Financeiro
| Tabela | Descrição |
|--------|-----------|
| `payments` | Pagamentos |
| `payment_sessions` | Sessões de pagamento |
| `refunds` | Reembolsos |
| `saved_payment_methods` | Métodos salvos |
| `virtual_cards` | Cartões virtuais |
| `stripe_configs` | Configurações Stripe |
| `stripe_checkout_sessions` | Sessões checkout Stripe |
| `stripe_webhook_events` | Webhooks Stripe |
| `pagarme_configs` | Configurações Pagar.me |
| `pagarme_orders` | Pedidos Pagar.me |
| `pagarme_payment_links` | Links de pagamento |
| `pagarme_webhook_events` | Webhooks Pagar.me |
| `deposit_schedules` | Agendamentos depósito |

### 📊 Financeiro (Módulo Completo)
| Tabela | Descrição |
|--------|-----------|
| `financeiro_lancamentos` | Lançamentos |
| `financeiro_lancamentos_splits` | Splits de lançamentos |
| `financeiro_titulos` | Títulos |
| `financeiro_categorias` | Categorias |
| `financeiro_contas_bancarias` | Contas bancárias |
| `financeiro_centro_custos` | Centros de custo |
| `financeiro_linhas_extrato` | Linhas de extrato |
| `financeiro_regras_conciliacao` | Regras conciliação |
| `financeiro_campo_plano_contas_mapping` | Mapeamento plano contas |
| `reconciliation_items` | Itens conciliação |
| `reconciliation_runs` | Execuções conciliação |

### 🔗 Integrações OTA
| Tabela | Descrição |
|--------|-----------|
| `ota_api_credentials` | Credenciais API |
| `ota_sync_logs` | Logs de sincronização |
| `ota_webhook_subscriptions` | Subscrições webhook |
| `ota_webhooks` | Webhooks recebidos |
| `ota_amenity_mappings` | Mapeamento amenidades |
| `ota_bed_type_mappings` | Mapeamento tipos cama |
| `ota_cancellation_policy_mappings` | Mapeamento políticas |
| `ota_fee_type_mappings` | Mapeamento taxas |
| `ota_image_category_mappings` | Mapeamento imagens |
| `ota_language_mappings` | Mapeamento idiomas |
| `ota_payment_type_mappings` | Mapeamento pagamentos |
| `ota_property_type_mappings` | Mapeamento tipos prop |
| `ota_rate_plan_mappings` | Mapeamento rate plans |
| `ota_region_mappings` | Mapeamento regiões |
| `ota_reservation_status_mappings` | Mapeamento status |
| `ota_room_type_mappings` | Mapeamento room types |
| `ota_room_view_mappings` | Mapeamento vistas |
| `ota_theme_mappings` | Mapeamento temas |

### 🔗 Channex (Channel Manager)
| Tabela | Descrição |
|--------|-----------|
| `channex_accounts` | Contas Channex |
| `channex_channel_connections` | Conexões de canais |
| `channex_listing_connections` | Conexões de listings |
| `channex_property_mappings` | Mapeamento propriedades |
| `channex_rate_plan_mappings` | Mapeamento rate plans |
| `channex_room_type_mappings` | Mapeamento room types |
| `channex_webhook_logs` | Logs webhooks |
| `channex_webhooks` | Webhooks recebidos |

### 🔗 Stays.net
| Tabela | Descrição |
|--------|-----------|
| `staysnet_config` | Configurações |
| `staysnet_import_issues` | Problemas importação |
| `staysnet_properties_cache` | Cache propriedades |
| `staysnet_reservations_cache` | Cache reservas |
| `staysnet_sync_log` | Log sincronização |
| `staysnet_webhooks` | Webhooks |
| `staysnet_raw_objects` | Objetos raw |

### 💬 Chat & Comunicação
| Tabela | Descrição |
|--------|-----------|
| `chat_contacts` | Contatos chat |
| `chat_conversations` | Conversas |
| `chat_messages` | Mensagens |
| `chat_message_templates` | Templates mensagens |
| `chat_channel_configs` | Configurações canal |
| `chat_channels_config` | Config canais (alt) |
| `chat_webhooks` | Webhooks chat |
| `conversations` | Conversas (legacy?) |
| `messages` | Mensagens (legacy?) |
| `conversation_activity_logs` | Logs atividade |
| `channel_contacts` | Contatos por canal |
| `channel_instances` | Instâncias de canal |

### 📱 Evolution API (WhatsApp)
| Tabela | Descrição |
|--------|-----------|
| `evolution_instances` | Instâncias Evolution |
| `evolution_instances_backup` | Backup instâncias |

### 📢 Anúncios & Listings
| Tabela | Descrição |
|--------|-----------|
| `listings` | Listings publicados |
| `listing_settings` | Configurações listing |
| `anuncios_published` | Anúncios publicados |
| `anuncios_pending_changes` | Mudanças pendentes |
| `anuncios_field_changes` | Mudanças de campos |
| `anuncios_versions` | Versões anúncios |

### 🏢 CRM & Vendas
| Tabela | Descrição |
|--------|-----------|
| `crm_contacts` | Contatos CRM |
| `crm_companies` | Empresas |
| `crm_projects` | Projetos |
| `crm_tasks` | Tarefas |
| `crm_notes` | Notas |
| `crm_card_items` | Itens de card |
| `crm_products_services` | Produtos/Serviços |
| `crm_templates` | Templates |
| `crm_lost_reasons` | Motivos de perda |

### 📈 Sales & Deals
| Tabela | Descrição |
|--------|-----------|
| `sales_funnels` | Funis de venda |
| `sales_funnel_stages` | Estágios do funil |
| `sales_deals` | Negócios/Deals |
| `sales_deal_activities` | Atividades |

### 🎫 Service Tickets
| Tabela | Descrição |
|--------|-----------|
| `service_funnels` | Funis de serviço |
| `service_funnel_stages` | Estágios |
| `service_tickets` | Tickets |
| `service_ticket_activities` | Atividades |

### ✅ Tarefas Operacionais
| Tabela | Descrição |
|--------|-----------|
| `operational_tasks` | Tarefas operacionais |
| `operational_task_templates` | Templates |
| `task_activities` | Atividades |
| `task_comments` | Comentários |
| `task_dependencies` | Dependências |

### 🏗️ Real Estate (Imobiliário)
| Tabela | Descrição |
|--------|-----------|
| `re_companies` | Construtoras/Imobiliárias |
| `re_developments` | Empreendimentos |
| `re_units` | Unidades |
| `re_brokers` | Corretores |
| `re_broker_invites` | Convites corretores |
| `re_broker_rankings` | Rankings |
| `re_broker_campaigns` | Campanhas |
| `re_broker_campaign_participation` | Participações |
| `re_broker_chat_channels` | Canais chat |
| `re_broker_chat_messages` | Mensagens chat |
| `re_demands` | Demandas |
| `re_reservations` | Reservas imob |
| `re_transactions` | Transações |
| `re_partnerships` | Parcerias |
| `re_messages` | Mensagens |
| `re_marketplace_conversations` | Conversas marketplace |
| `re_marketplace_messages` | Mensagens marketplace |
| `re_marketplace_participants` | Participantes |

### 🤖 AI & Automação
| Tabela | Descrição |
|--------|-----------|
| `ai_provider_configs` | Configurações AI |
| `ai_agent_construtoras` | Agente construtoras |
| `ai_agent_empreendimentos` | Agente empreend. |
| `ai_agent_unidades` | Agente unidades |
| `automations` | Automações |
| `automation_executions` | Execuções |

### 👥 Usuários & Organizações
| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários |
| `profiles` | Perfis |
| `sessions` | Sessões |
| `organizations` | Organizações |
| `organization_settings` | Configurações org |
| `organization_channel_config` | Config canais org |
| `teams` | Times |
| `team_members` | Membros time |
| `tenants` | Tenants |
| `owners` | Proprietários |
| `owner_users` | Usuários proprietários |
| `permissions` | Permissões |
| `invitations` | Convites |
| `user_invitations` | Convites usuário |

### 🔐 Autenticação
| Tabela | Descrição |
|--------|-----------|
| `password_recovery_requests` | Recuperação senha |
| `password_reset_tokens` | Tokens reset |

### 🔔 Notificações
| Tabela | Descrição |
|--------|-----------|
| `notifications` | Notificações |
| `notification_templates` | Templates |
| `notification_trigger_types` | Tipos de trigger |

### 📊 Dados Canônicos (Lookup)
| Tabela | Descrição |
|--------|-----------|
| `canonical_amenities` | Amenidades |
| `canonical_bed_types` | Tipos de cama |
| `canonical_fee_types` | Tipos de taxa |
| `canonical_image_categories` | Categorias imagem |
| `canonical_languages` | Idiomas |
| `canonical_payment_types` | Tipos pagamento |
| `canonical_property_types` | Tipos propriedade |
| `canonical_reservation_statuses` | Status reserva |
| `canonical_room_types` | Tipos de quarto |
| `canonical_room_views` | Vistas |
| `canonical_themes` | Temas |
| `country_iso_codes` | Códigos ISO países |

### 🌐 Sites & Blocks
| Tabela | Descrição |
|--------|-----------|
| `client_sites` | Sites de clientes |
| `blocks` | Blocos/Componentes |

### 🔧 Sistema & Logs
| Tabela | Descrição |
|--------|-----------|
| `activity_logs` | Logs de atividade |
| `custom_fields` | Campos customizados |
| `custom_field_values` | Valores campos |
| `integration_configs` | Configs integração |
| `short_ids` | IDs curtos |
| `kv_store_67caf26a` | Key-Value store |
| `kv_backups` | Backups KV |
| `users_kv_mappings` | Mapeamentos KV |

### 📋 CRM Funis Predeterminados
| Tabela | Descrição |
|--------|-----------|
| `predetermined_funnels` | Funis predeterminados |
| `predetermined_funnel_stages` | Estágios |
| `predetermined_items` | Itens |
| `predetermined_item_activities` | Atividades |

### 💼 Pagamentos Corporativos
| Tabela | Descrição |
|--------|-----------|
| `corporate_payment_configs` | Configs corporativas |
| `billing_contacts` | Contatos faturamento |

---

## Arquivo de Dump Completo

O schema completo está disponível em:
```
supabase/schema_dump_2026_02_06.sql
```

Para regenerar:
```bash
supabase db dump --linked --schema public -f supabase/schema_dump_YYYY_MM_DD.sql
```
