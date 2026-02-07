/**
 * Channex Sync Routes — Fase 2: Mapping de Entidades
 * 
 * Multi-account architecture:
 *   Organization → N channex_accounts → N channel_connections
 *   Account → N property_mappings → N room_type_mappings → N rate_plan_mappings
 * 
 * Endpoints:
 * 
 * ACCOUNTS (CRUD):
 *   POST   /channex/accounts              - Create Channex account (API key)
 *   GET    /channex/accounts              - List accounts for org
 *   PUT    /channex/accounts/:id          - Update account
 *   DELETE /channex/accounts/:id          - Delete account
 *   POST   /channex/accounts/:id/test     - Test account connection
 * 
 * SYNC PROPERTY:
 *   POST   /channex/accounts/:accountId/sync-property       - Sync property to Channex
 *   POST   /channex/accounts/:accountId/sync-rooms           - Sync rooms for a mapped property
 *   POST   /channex/accounts/:accountId/sync-rate-plans      - Sync rate plans for mapped rooms
 *   GET    /channex/accounts/:accountId/mappings              - List all mappings for account
 * 
 * CHANNEL CONNECTIONS:
 *   POST   /channex/accounts/:accountId/channels              - Register channel connection
 *   GET    /channex/accounts/:accountId/channels              - List channel connections
 * 
 * LISTING CONNECTIONS:
 *   POST   /channex/listings                                   - Connect listing to channel
 *   GET    /channex/accounts/:accountId/listings               - List listing connections
 */

import { Context } from 'npm:hono';
import { successResponse, errorResponse, logInfo, logError } from './utils.ts';
import { 
  getChannexClient, 
  mapCurrencyToChannex, 
  mapCountryToISO,
  ChannexClient,
  ChannexCredentials,
} from './utils-channex.ts';
import { getSupabaseClient } from './kv_store.tsx';
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';

// ============================================================================
// HELPER: Get ChannexClient from account_id
// ============================================================================

async function getClientForAccount(
  supabase: any, 
  accountId: string, 
  organizationId: string
): Promise<{ client: ChannexClient; account: any } | null> {
  const { data: account, error } = await supabase
    .from('channex_accounts')
    .select('*')
    .eq('id', accountId)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single();

  if (error || !account) {
    return null;
  }

  const baseUrl = account.environment === 'production'
    ? 'https://app.channex.io/api/v1'
    : 'https://staging.channex.io/api/v1';

  const client = getChannexClient({
    apiToken: account.api_key,
    environment: account.environment,
    baseUrl,
  });

  return { client, account };
}

// ============================================================================
// ACCOUNTS CRUD
// ============================================================================

/**
 * POST /channex/accounts
 * Create a new Channex account (API key) for the organization
 */
export async function createAccount(c: Context) {
  try {
    const supabase = getSupabaseClient(c);
    const organizationId = await getOrganizationIdOrThrow(c);
    const body = await c.req.json();

    const { label, api_key, environment = 'staging' } = body;

    if (!label || !api_key) {
      return errorResponse('label and api_key are required');
    }

    if (!['staging', 'production'].includes(environment)) {
      return errorResponse('environment must be "staging" or "production"');
    }

    // Test the API key before saving
    const baseUrl = environment === 'production'
      ? 'https://app.channex.io/api/v1'
      : 'https://staging.channex.io/api/v1';

    const testClient = getChannexClient({ apiToken: api_key, environment, baseUrl });
    const testResult = await testClient.testConnection();

    const { data: account, error } = await supabase
      .from('channex_accounts')
      .insert({
        organization_id: organizationId,
        label,
        api_key,
        environment,
        is_active: true,
        last_connection_test_at: new Date().toISOString(),
        last_connection_status: testResult.success ? 'ok' : 'error',
      })
      .select()
      .single();

    if (error) {
      logError('[Channex] Create account error', error);
      return errorResponse(`Failed to create account: ${error.message}`);
    }

    logInfo(`[Channex] Account created: ${account.id} (${label})`);

    return successResponse({
      account: { ...account, api_key: '***' }, // Don't expose key in response
      connectionTest: {
        success: testResult.success,
        error: testResult.error,
        propertiesCount: testResult.data?.propertiesCount,
      },
    });
  } catch (error) {
    logError('[Channex] Create account error', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * GET /channex/accounts
 * List all Channex accounts for the organization
 */
export async function listAccounts(c: Context) {
  try {
    const supabase = getSupabaseClient(c);
    const organizationId = await getOrganizationIdOrThrow(c);

    const { data: accounts, error } = await supabase
      .from('channex_accounts')
      .select(`
        id, organization_id, label, environment, 
        channex_group_id, channex_user_id,
        is_active, last_connection_test_at, last_connection_status,
        created_at, updated_at
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (error) {
      return errorResponse(`Failed to list accounts: ${error.message}`);
    }

    return successResponse({ accounts: accounts || [] });
  } catch (error) {
    logError('[Channex] List accounts error', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * PUT /channex/accounts/:id
 * Update a Channex account
 */
export async function updateAccount(c: Context) {
  try {
    const supabase = getSupabaseClient(c);
    const organizationId = await getOrganizationIdOrThrow(c);
    const accountId = c.req.param('id');
    const body = await c.req.json();

    const allowedFields = ['label', 'api_key', 'environment', 'is_active'];
    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return errorResponse('No valid fields to update');
    }

    const { data: account, error } = await supabase
      .from('channex_accounts')
      .update(updateData)
      .eq('id', accountId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      return errorResponse(`Failed to update account: ${error.message}`);
    }

    return successResponse({ account: { ...account, api_key: '***' } });
  } catch (error) {
    logError('[Channex] Update account error', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * DELETE /channex/accounts/:id
 * Delete a Channex account (cascade deletes all mappings)
 */
export async function deleteAccount(c: Context) {
  try {
    const supabase = getSupabaseClient(c);
    const organizationId = await getOrganizationIdOrThrow(c);
    const accountId = c.req.param('id');

    const { error } = await supabase
      .from('channex_accounts')
      .delete()
      .eq('id', accountId)
      .eq('organization_id', organizationId);

    if (error) {
      return errorResponse(`Failed to delete account: ${error.message}`);
    }

    logInfo(`[Channex] Account deleted: ${accountId}`);
    return successResponse({ deleted: true, accountId });
  } catch (error) {
    logError('[Channex] Delete account error', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * POST /channex/accounts/:id/test
 * Test connection for a specific account
 */
export async function testAccountConnection(c: Context) {
  try {
    const supabase = getSupabaseClient(c);
    const organizationId = await getOrganizationIdOrThrow(c);
    const accountId = c.req.param('id');

    const result = await getClientForAccount(supabase, accountId, organizationId);
    if (!result) {
      return errorResponse('Account not found or inactive');
    }

    const { client, account } = result;
    const testResult = await client.testConnection();

    // Update last_connection_test
    await supabase
      .from('channex_accounts')
      .update({
        last_connection_test_at: new Date().toISOString(),
        last_connection_status: testResult.success ? 'ok' : 'error',
      })
      .eq('id', accountId);

    return successResponse({
      accountId,
      label: account.label,
      environment: account.environment,
      connected: testResult.success,
      propertiesCount: testResult.data?.propertiesCount,
      error: testResult.error,
    });
  } catch (error) {
    logError('[Channex] Test account connection error', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

// ============================================================================
// SYNC PROPERTY
// ============================================================================

/**
 * POST /channex/accounts/:accountId/sync-property
 * 
 * Sync a Rendizy property to Channex, creating or updating it.
 * Stores the mapping in channex_property_mappings.
 * 
 * Body: { propertyId: UUID, channexPropertyId?: string }
 */
export async function syncPropertyToChannex(c: Context) {
  try {
    const supabase = getSupabaseClient(c);
    const organizationId = await getOrganizationIdOrThrow(c);
    const accountId = c.req.param('accountId');
    const body = await c.req.json();
    const { propertyId, channexPropertyId } = body;

    if (!propertyId) {
      return errorResponse('propertyId is required');
    }

    // Get Channex client for this account
    const accountResult = await getClientForAccount(supabase, accountId, organizationId);
    if (!accountResult) {
      return errorResponse('Channex account not found or inactive');
    }
    const { client } = accountResult;

    // Fetch Rendizy property
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .eq('organization_id', organizationId)
      .single();

    if (propError || !property) {
      return errorResponse(`Property not found: ${propError?.message || 'Not found'}`);
    }

    // Map Rendizy → Channex format
    const d = property.data || {};
    const address = d.address || d.location?.address || {};
    const pricing = d.pricing || {};
    const contact = d.contact || {};
    const location = d.location || {};

    const channexData = {
      title: d.name || d.title || property.name || property.title || 'Propriedade sem nome',
      currency: mapCurrencyToChannex(pricing.currency || d.currency || 'BRL'),
      timezone: d.timezone || 'America/Sao_Paulo',
      address: address.street || address.line1 || address.address || '',
      zip: address.postalCode || address.zipCode || address.zip || '',
      city: address.city || '',
      state: address.state || '',
      country: mapCountryToISO(address.country || 'BR'),
      email: contact.email || d.email || '',
      phone: contact.phone || d.phone || '',
      latitude: location.lat || location.latitude,
      longitude: location.lng || location.longitude,
    };

    let result;
    let action: 'created' | 'updated';

    // Check if already mapped
    const existingChxId = channexPropertyId || null;
    
    if (!existingChxId) {
      // Check DB for existing mapping
      const { data: existing } = await supabase
        .from('channex_property_mappings')
        .select('channex_property_id')
        .eq('rendizy_property_id', propertyId)
        .single();

      if (existing?.channex_property_id) {
        result = await client.updateProperty(existing.channex_property_id, channexData);
        action = 'updated';
      } else {
        result = await client.createProperty(channexData);
        action = 'created';
      }
    } else {
      result = await client.updateProperty(existingChxId, channexData);
      action = 'updated';
    }

    if (!result.success) {
      return errorResponse(`Failed to ${action === 'updated' ? 'update' : 'create'} property in Channex: ${result.error}`);
    }

    const newChannexId = result.data?.data?.id || existingChxId;

    if (!newChannexId) {
      return errorResponse('Channex did not return a property ID');
    }

    // Upsert mapping
    const { data: mapping, error: mappingError } = await supabase
      .from('channex_property_mappings')
      .upsert({
        account_id: accountId,
        rendizy_property_id: propertyId,
        channex_property_id: newChannexId,
        sync_status: 'synced',
        last_sync_at: new Date().toISOString(),
        sync_error: null,
      }, {
        onConflict: 'rendizy_property_id',
      })
      .select()
      .single();

    if (mappingError) {
      logError('[Channex] Failed to store property mapping', mappingError);
    }

    logInfo(`[Channex] Property ${action}: ${propertyId} → ${newChannexId}`);

    return successResponse({
      action,
      propertyId,
      channexPropertyId: newChannexId,
      mapping,
      channexData,
    });
  } catch (error) {
    logError('[Channex] Sync property error', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

// ============================================================================
// SYNC ROOMS
// ============================================================================

/**
 * POST /channex/accounts/:accountId/sync-rooms
 * 
 * Sync all rooms of a Rendizy property to Channex as room_types.
 * Requires the property to be already mapped.
 * 
 * Body: { propertyId: UUID }
 */
export async function syncRoomsToChannex(c: Context) {
  try {
    const supabase = getSupabaseClient(c);
    const organizationId = await getOrganizationIdOrThrow(c);
    const accountId = c.req.param('accountId');
    const body = await c.req.json();
    const { propertyId } = body;

    if (!propertyId) {
      return errorResponse('propertyId is required');
    }

    // Get client
    const accountResult = await getClientForAccount(supabase, accountId, organizationId);
    if (!accountResult) {
      return errorResponse('Channex account not found or inactive');
    }
    const { client } = accountResult;

    // Get property mapping
    const { data: propMapping, error: propMapError } = await supabase
      .from('channex_property_mappings')
      .select('*')
      .eq('account_id', accountId)
      .eq('rendizy_property_id', propertyId)
      .single();

    if (propMapError || !propMapping) {
      return errorResponse('Property not mapped to Channex yet. Sync the property first.');
    }

    // Fetch rooms from Rendizy
    const { data: rooms, error: roomsError } = await supabase
      .from('property_rooms')
      .select('*')
      .eq('property_id', propertyId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (roomsError) {
      return errorResponse(`Failed to fetch rooms: ${roomsError.message}`);
    }

    if (!rooms || rooms.length === 0) {
      return errorResponse('No active rooms found for this property');
    }

    const results: any[] = [];

    for (const room of rooms) {
      try {
        // Check if already mapped
        const { data: existingMap } = await supabase
          .from('channex_room_type_mappings')
          .select('channex_room_type_id')
          .eq('property_mapping_id', propMapping.id)
          .eq('rendizy_room_id', room.id)
          .single();

        const roomTypeData = {
          title: room.name || 'Quarto',
          property_id: propMapping.channex_property_id,
          count_of_rooms: 1,
          occ_base: room.standard_occupancy || room.max_adults || 2,
          occ_max: room.max_occupancy || room.max_adults || 2,
          default_occupancy: room.standard_occupancy || 2,
        };

        let result;
        let roomAction: 'created' | 'updated';

        if (existingMap?.channex_room_type_id) {
          result = await client.updateRoomType(existingMap.channex_room_type_id, roomTypeData);
          roomAction = 'updated';
        } else {
          result = await client.createRoomType(roomTypeData);
          roomAction = 'created';
        }

        if (result.success) {
          const channexRoomTypeId = result.data?.data?.id || existingMap?.channex_room_type_id;

          if (channexRoomTypeId) {
            await supabase
              .from('channex_room_type_mappings')
              .upsert({
                property_mapping_id: propMapping.id,
                rendizy_room_id: room.id,
                channex_room_type_id: channexRoomTypeId,
              }, {
                onConflict: 'rendizy_room_id',
              });
          }

          results.push({
            roomId: room.id,
            roomName: room.name,
            action: roomAction,
            channexRoomTypeId,
            success: true,
          });
        } else {
          results.push({
            roomId: room.id,
            roomName: room.name,
            success: false,
            error: result.error,
          });
        }
      } catch (roomError) {
        results.push({
          roomId: room.id,
          roomName: room.name,
          success: false,
          error: roomError instanceof Error ? roomError.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    logInfo(`[Channex] Rooms synced: ${successCount}/${rooms.length} for property ${propertyId}`);

    return successResponse({
      propertyId,
      channexPropertyId: propMapping.channex_property_id,
      totalRooms: rooms.length,
      synced: successCount,
      failed: rooms.length - successCount,
      results,
    });
  } catch (error) {
    logError('[Channex] Sync rooms error', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

// ============================================================================
// SYNC RATE PLANS
// ============================================================================

/**
 * POST /channex/accounts/:accountId/sync-rate-plans
 * 
 * Sync rate plans for a property's rooms to Channex.
 * Requires rooms to be already mapped.
 * 
 * Body: { propertyId: UUID }
 */
export async function syncRatePlansToChannex(c: Context) {
  try {
    const supabase = getSupabaseClient(c);
    const organizationId = await getOrganizationIdOrThrow(c);
    const accountId = c.req.param('accountId');
    const body = await c.req.json();
    const { propertyId } = body;

    if (!propertyId) {
      return errorResponse('propertyId is required');
    }

    // Get client
    const accountResult = await getClientForAccount(supabase, accountId, organizationId);
    if (!accountResult) {
      return errorResponse('Channex account not found or inactive');
    }
    const { client } = accountResult;

    // Get property mapping
    const { data: propMapping } = await supabase
      .from('channex_property_mappings')
      .select('*')
      .eq('account_id', accountId)
      .eq('rendizy_property_id', propertyId)
      .single();

    if (!propMapping) {
      return errorResponse('Property not mapped to Channex yet.');
    }

    // Get room type mappings for this property
    const { data: roomMappings } = await supabase
      .from('channex_room_type_mappings')
      .select('*')
      .eq('property_mapping_id', propMapping.id);

    if (!roomMappings || roomMappings.length === 0) {
      return errorResponse('No room types mapped yet. Sync rooms first.');
    }

    // Get rate plans for this property
    const { data: ratePlans, error: rpError } = await supabase
      .from('rate_plans')
      .select('*')
      .eq('organization_id', organizationId)
      .or(`property_id.eq.${propertyId},property_id.is.null`)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (rpError) {
      return errorResponse(`Failed to fetch rate plans: ${rpError.message}`);
    }

    if (!ratePlans || ratePlans.length === 0) {
      return errorResponse('No active rate plans found for this property');
    }

    const results: any[] = [];

    // For each room mapping, sync rate plans
    for (const roomMapping of roomMappings) {
      for (const ratePlan of ratePlans) {
        try {
          // Check existing mapping
          const { data: existingMap } = await supabase
            .from('channex_rate_plan_mappings')
            .select('channex_rate_plan_id')
            .eq('room_type_mapping_id', roomMapping.id)
            .eq('rendizy_rate_plan_id', ratePlan.id)
            .single();

          // Map cancellation policy
          let cancellationType = 'free';
          if (!ratePlan.is_refundable) cancellationType = 'non_refundable';

          const ratePlanData = {
            title: ratePlan.name_pt || ratePlan.name_en || ratePlan.code,
            room_type_id: roomMapping.channex_room_type_id,
            currency: ratePlan.deposit_currency || 'BRL',
            sell_mode: 'per_room' as const,
            rate_mode: 'manual' as const,
            options: [
              {
                occupancy: roomMapping.occ_base || 2,
                is_primary: true,
                rate: 0, // Will be set via ARI updates (Fase 3)
              },
            ],
          };

          let result;
          let rpAction: 'created' | 'updated';

          if (existingMap?.channex_rate_plan_id) {
            result = await client.updateRatePlan(existingMap.channex_rate_plan_id, ratePlanData);
            rpAction = 'updated';
          } else {
            result = await client.createRatePlan(ratePlanData);
            rpAction = 'created';
          }

          if (result.success) {
            const channexRatePlanId = result.data?.data?.id || existingMap?.channex_rate_plan_id;

            if (channexRatePlanId) {
              await supabase
                .from('channex_rate_plan_mappings')
                .upsert({
                  room_type_mapping_id: roomMapping.id,
                  rendizy_rate_plan_id: ratePlan.id,
                  channex_rate_plan_id: channexRatePlanId,
                  sell_mode: 'per_room',
                  currency: ratePlanData.currency,
                }, {
                  onConflict: 'rendizy_rate_plan_id',
                });
            }

            results.push({
              ratePlanId: ratePlan.id,
              ratePlanName: ratePlan.name_pt,
              roomId: roomMapping.rendizy_room_id,
              action: rpAction,
              channexRatePlanId,
              success: true,
            });
          } else {
            results.push({
              ratePlanId: ratePlan.id,
              ratePlanName: ratePlan.name_pt,
              roomId: roomMapping.rendizy_room_id,
              success: false,
              error: result.error,
            });
          }
        } catch (rpErr) {
          results.push({
            ratePlanId: ratePlan.id,
            ratePlanName: ratePlan.name_pt,
            roomId: roomMapping.rendizy_room_id,
            success: false,
            error: rpErr instanceof Error ? rpErr.message : 'Unknown error',
          });
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    logInfo(`[Channex] Rate plans synced: ${successCount}/${results.length} for property ${propertyId}`);

    return successResponse({
      propertyId,
      totalRatePlans: ratePlans.length,
      totalRoomMappings: roomMappings.length,
      totalCombinations: results.length,
      synced: successCount,
      failed: results.length - successCount,
      results,
    });
  } catch (error) {
    logError('[Channex] Sync rate plans error', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

// ============================================================================
// GET ALL MAPPINGS FOR ACCOUNT
// ============================================================================

/**
 * GET /channex/accounts/:accountId/mappings
 * 
 * List all property → room → rate_plan mappings for an account
 */
export async function listMappings(c: Context) {
  try {
    const supabase = getSupabaseClient(c);
    const organizationId = await getOrganizationIdOrThrow(c);
    const accountId = c.req.param('accountId');

    // Verify account belongs to org
    const { data: account } = await supabase
      .from('channex_accounts')
      .select('id, label, environment')
      .eq('id', accountId)
      .eq('organization_id', organizationId)
      .single();

    if (!account) {
      return errorResponse('Account not found');
    }

    // Get property mappings with nested rooms and rate plans
    const { data: propertyMappings, error } = await supabase
      .from('channex_property_mappings')
      .select(`
        *,
        property:properties(id, data, status),
        room_types:channex_room_type_mappings(
          *,
          room:property_rooms(id, name, max_occupancy, max_adults, base_price, currency),
          rate_plans:channex_rate_plan_mappings(
            *,
            rate_plan:rate_plans(id, code, name_pt, is_refundable, is_active)
          )
        )
      `)
      .eq('account_id', accountId)
      .order('created_at', { ascending: true });

    if (error) {
      return errorResponse(`Failed to list mappings: ${error.message}`);
    }

    return successResponse({
      account,
      mappings: propertyMappings || [],
      summary: {
        properties: propertyMappings?.length || 0,
        roomTypes: propertyMappings?.reduce((acc: number, p: any) => acc + (p.room_types?.length || 0), 0) || 0,
        ratePlans: propertyMappings?.reduce(
          (acc: number, p: any) => acc + (p.room_types?.reduce(
            (a2: number, r: any) => a2 + (r.rate_plans?.length || 0), 0
          ) || 0), 0
        ) || 0,
      },
    });
  } catch (error) {
    logError('[Channex] List mappings error', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

// ============================================================================
// CHANNEL CONNECTIONS
// ============================================================================

/**
 * POST /channex/accounts/:accountId/channels
 * Register a channel (OTA) connection
 * 
 * Body: { channel_code, label, channex_channel_id?, ota_account_email?, ota_account_name? }
 */
export async function createChannelConnection(c: Context) {
  try {
    const supabase = getSupabaseClient(c);
    const organizationId = await getOrganizationIdOrThrow(c);
    const accountId = c.req.param('accountId');
    const body = await c.req.json();

    // Verify account
    const { data: account } = await supabase
      .from('channex_accounts')
      .select('id')
      .eq('id', accountId)
      .eq('organization_id', organizationId)
      .single();

    if (!account) {
      return errorResponse('Account not found');
    }

    const { channel_code, label, channex_channel_id, ota_account_email, ota_account_name } = body;

    if (!channel_code || !label) {
      return errorResponse('channel_code and label are required');
    }

    const { data: connection, error } = await supabase
      .from('channex_channel_connections')
      .insert({
        account_id: accountId,
        channel_code,
        label,
        channex_channel_id: channex_channel_id || null,
        ota_account_email: ota_account_email || null,
        ota_account_name: ota_account_name || null,
        is_active: true,
        sync_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      return errorResponse(`Failed to create channel connection: ${error.message}`);
    }

    logInfo(`[Channex] Channel connection created: ${channel_code} - ${label}`);
    return successResponse({ connection });
  } catch (error) {
    logError('[Channex] Create channel connection error', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * GET /channex/accounts/:accountId/channels
 * List channel connections for an account
 */
export async function listChannelConnections(c: Context) {
  try {
    const supabase = getSupabaseClient(c);
    const organizationId = await getOrganizationIdOrThrow(c);
    const accountId = c.req.param('accountId');

    // Verify account
    const { data: account } = await supabase
      .from('channex_accounts')
      .select('id')
      .eq('id', accountId)
      .eq('organization_id', organizationId)
      .single();

    if (!account) {
      return errorResponse('Account not found');
    }

    const { data: connections, error } = await supabase
      .from('channex_channel_connections')
      .select('*')
      .eq('account_id', accountId)
      .order('channel_code', { ascending: true });

    if (error) {
      return errorResponse(`Failed to list channels: ${error.message}`);
    }

    return successResponse({ connections: connections || [] });
  } catch (error) {
    logError('[Channex] List channel connections error', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

// ============================================================================
// LISTING CONNECTIONS
// ============================================================================

/**
 * POST /channex/listings
 * Connect a mapped property to a specific OTA channel
 * 
 * Body: { property_mapping_id, channel_connection_id, ota_listing_id?, ota_listing_url? }
 */
export async function createListingConnection(c: Context) {
  try {
    const supabase = getSupabaseClient(c);
    const organizationId = await getOrganizationIdOrThrow(c);
    const body = await c.req.json();

    const {
      property_mapping_id,
      channel_connection_id,
      ota_listing_id,
      ota_listing_url,
    } = body;

    if (!property_mapping_id || !channel_connection_id) {
      return errorResponse('property_mapping_id and channel_connection_id are required');
    }

    // Verify ownership through account → org
    const { data: propMapping } = await supabase
      .from('channex_property_mappings')
      .select('account_id')
      .eq('id', property_mapping_id)
      .single();

    if (!propMapping) {
      return errorResponse('Property mapping not found');
    }

    const { data: account } = await supabase
      .from('channex_accounts')
      .select('id')
      .eq('id', propMapping.account_id)
      .eq('organization_id', organizationId)
      .single();

    if (!account) {
      return errorResponse('Unauthorized: account does not belong to your organization');
    }

    const { data: listing, error } = await supabase
      .from('channex_listing_connections')
      .upsert({
        property_mapping_id,
        channel_connection_id,
        ota_listing_id: ota_listing_id || null,
        ota_listing_url: ota_listing_url || null,
        is_active: true,
        sync_status: 'pending',
      }, {
        onConflict: 'property_mapping_id,channel_connection_id',
      })
      .select()
      .single();

    if (error) {
      return errorResponse(`Failed to create listing connection: ${error.message}`);
    }

    logInfo(`[Channex] Listing connection created: property_mapping=${property_mapping_id}, channel=${channel_connection_id}`);
    return successResponse({ listing });
  } catch (error) {
    logError('[Channex] Create listing connection error', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * GET /channex/accounts/:accountId/listings
 * List all listing connections for an account
 */
export async function listListingConnections(c: Context) {
  try {
    const supabase = getSupabaseClient(c);
    const organizationId = await getOrganizationIdOrThrow(c);
    const accountId = c.req.param('accountId');

    // Verify account
    const { data: account } = await supabase
      .from('channex_accounts')
      .select('id')
      .eq('id', accountId)
      .eq('organization_id', organizationId)
      .single();

    if (!account) {
      return errorResponse('Account not found');
    }

    const { data: listings, error } = await supabase
      .from('channex_listing_connections')
      .select(`
        *,
        property_mapping:channex_property_mappings(
          rendizy_property_id,
          channex_property_id,
          property:properties(id, data)
        ),
        channel_connection:channex_channel_connections(
          channel_code,
          label,
          ota_account_email
        )
      `)
      .in('property_mapping_id', 
        // Subquery: all property mappings for this account
        (await supabase
          .from('channex_property_mappings')
          .select('id')
          .eq('account_id', accountId)
        ).data?.map((p: any) => p.id) || []
      )
      .order('created_at', { ascending: true });

    if (error) {
      return errorResponse(`Failed to list listings: ${error.message}`);
    }

    return successResponse({ listings: listings || [] });
  } catch (error) {
    logError('[Channex] List listing connections error', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

// ============================================================================
// FULL SYNC (Property + Rooms + Rate Plans em uma chamada)
// ============================================================================

/**
 * POST /channex/accounts/:accountId/full-sync
 * 
 * Sync completo: Property → Rooms → Rate Plans
 * Body: { propertyId: UUID }
 */
export async function fullSync(c: Context) {
  try {
    const supabase = getSupabaseClient(c);
    const organizationId = await getOrganizationIdOrThrow(c);
    const accountId = c.req.param('accountId');
    const body = await c.req.json();
    const { propertyId } = body;

    if (!propertyId) {
      return errorResponse('propertyId is required');
    }

    const accountResult = await getClientForAccount(supabase, accountId, organizationId);
    if (!accountResult) {
      return errorResponse('Channex account not found or inactive');
    }
    const { client } = accountResult;

    logInfo(`[Channex] Starting full sync for property ${propertyId}`);

    const timeline: any[] = [];

    // ---- Step 1: Sync Property ----
    const { data: property, error: propError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .eq('organization_id', organizationId)
      .single();

    if (propError || !property) {
      return errorResponse(`Property not found: ${propError?.message || 'Not found'}`);
    }

    const d = property.data || {};
    const address = d.address || d.location?.address || {};
    const pricing = d.pricing || {};
    const contact = d.contact || {};
    const location = d.location || {};

    const channexPropData = {
      title: d.name || d.title || property.name || 'Propriedade',
      currency: mapCurrencyToChannex(pricing.currency || d.currency || 'BRL'),
      timezone: d.timezone || 'America/Sao_Paulo',
      address: address.street || address.line1 || address.address || '',
      zip: address.postalCode || address.zipCode || address.zip || '',
      city: address.city || '',
      country: mapCountryToISO(address.country || 'BR'),
      email: contact.email || d.email || '',
      phone: contact.phone || d.phone || '',
      latitude: location.lat || location.latitude,
      longitude: location.lng || location.longitude,
    };

    // Check existing mapping
    const { data: existingPropMap } = await supabase
      .from('channex_property_mappings')
      .select('channex_property_id')
      .eq('rendizy_property_id', propertyId)
      .single();

    let propResult;
    let propAction: string;
    if (existingPropMap?.channex_property_id) {
      propResult = await client.updateProperty(existingPropMap.channex_property_id, channexPropData);
      propAction = 'updated';
    } else {
      propResult = await client.createProperty(channexPropData);
      propAction = 'created';
    }

    if (!propResult.success) {
      timeline.push({ step: 'property', success: false, error: propResult.error });
      return successResponse({ status: 'partial_failure', failedAt: 'property', timeline });
    }

    const channexPropertyId = propResult.data?.data?.id || existingPropMap?.channex_property_id;

    // Upsert property mapping
    const { data: propMapping } = await supabase
      .from('channex_property_mappings')
      .upsert({
        account_id: accountId,
        rendizy_property_id: propertyId,
        channex_property_id: channexPropertyId,
        sync_status: 'synced',
        last_sync_at: new Date().toISOString(),
        sync_error: null,
      }, { onConflict: 'rendizy_property_id' })
      .select()
      .single();

    timeline.push({ step: 'property', success: true, action: propAction, channexPropertyId });

    // ---- Step 2: Sync Rooms ----
    const { data: rooms } = await supabase
      .from('property_rooms')
      .select('*')
      .eq('property_id', propertyId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    const roomResults: any[] = [];
    if (rooms && rooms.length > 0 && propMapping) {
      for (const room of rooms) {
        const { data: existingRoomMap } = await supabase
          .from('channex_room_type_mappings')
          .select('channex_room_type_id')
          .eq('property_mapping_id', propMapping.id)
          .eq('rendizy_room_id', room.id)
          .single();

        const roomData = {
          title: room.name || 'Quarto',
          property_id: channexPropertyId,
          count_of_rooms: 1,
          occ_base: room.standard_occupancy || room.max_adults || 2,
          occ_max: room.max_occupancy || room.max_adults || 2,
          default_occupancy: room.standard_occupancy || 2,
        };

        let rr;
        let roomAction: string;
        if (existingRoomMap?.channex_room_type_id) {
          rr = await client.updateRoomType(existingRoomMap.channex_room_type_id, roomData);
          roomAction = 'updated';
        } else {
          rr = await client.createRoomType(roomData);
          roomAction = 'created';
        }

        const chxRoomId = rr.data?.data?.id || existingRoomMap?.channex_room_type_id;
        if (rr.success && chxRoomId) {
          await supabase.from('channex_room_type_mappings').upsert({
            property_mapping_id: propMapping.id,
            rendizy_room_id: room.id,
            channex_room_type_id: chxRoomId,
          }, { onConflict: 'rendizy_room_id' });
        }
        roomResults.push({ roomId: room.id, name: room.name, action: roomAction, success: rr.success, channexRoomTypeId: chxRoomId });
      }
    }
    timeline.push({ step: 'rooms', success: true, results: roomResults });

    // ---- Step 3: Sync Rate Plans ----
    const { data: ratePlans } = await supabase
      .from('rate_plans')
      .select('*')
      .eq('organization_id', organizationId)
      .or(`property_id.eq.${propertyId},property_id.is.null`)
      .eq('is_active', true);

    const { data: roomMappings } = await supabase
      .from('channex_room_type_mappings')
      .select('*')
      .eq('property_mapping_id', propMapping?.id);

    const rpResults: any[] = [];
    if (ratePlans && roomMappings && propMapping) {
      for (const rm of roomMappings) {
        for (const rp of ratePlans) {
          const { data: existingRpMap } = await supabase
            .from('channex_rate_plan_mappings')
            .select('channex_rate_plan_id')
            .eq('room_type_mapping_id', rm.id)
            .eq('rendizy_rate_plan_id', rp.id)
            .single();

          const rpData: any = {
            title: rp.name_pt || rp.name_en || rp.code,
            room_type_id: rm.channex_room_type_id,
            currency: rp.deposit_currency || 'BRL',
            sell_mode: 'per_room',
            rate_mode: 'manual',
            options: [{ occupancy: 2, is_primary: true, rate: 0 }],
          };

          let rpRe;
          let rpAct: string;
          if (existingRpMap?.channex_rate_plan_id) {
            rpRe = await client.updateRatePlan(existingRpMap.channex_rate_plan_id, rpData);
            rpAct = 'updated';
          } else {
            rpRe = await client.createRatePlan(rpData);
            rpAct = 'created';
          }

          const chxRpId = rpRe.data?.data?.id || existingRpMap?.channex_rate_plan_id;
          if (rpRe.success && chxRpId) {
            await supabase.from('channex_rate_plan_mappings').upsert({
              room_type_mapping_id: rm.id,
              rendizy_rate_plan_id: rp.id,
              channex_rate_plan_id: chxRpId,
              sell_mode: 'per_room',
              currency: rpData.currency,
            }, { onConflict: 'rendizy_rate_plan_id' });
          }
          rpResults.push({ ratePlanId: rp.id, name: rp.name_pt, roomId: rm.rendizy_room_id, action: rpAct, success: rpRe.success, channexRatePlanId: chxRpId });
        }
      }
    }
    timeline.push({ step: 'rate_plans', success: true, results: rpResults });

    logInfo(`[Channex] Full sync completed for property ${propertyId}`);

    return successResponse({
      status: 'complete',
      propertyId,
      channexPropertyId,
      summary: {
        property: propAction,
        rooms: { total: roomResults.length, synced: roomResults.filter(r => r.success).length },
        ratePlans: { total: rpResults.length, synced: rpResults.filter(r => r.success).length },
      },
      timeline,
    });
  } catch (error) {
    logError('[Channex] Full sync error', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}


// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

export function registerChannexSyncRoutes(app: any) {
  // Accounts CRUD
  app.post('/channex/accounts', createAccount);
  app.get('/channex/accounts', listAccounts);
  app.put('/channex/accounts/:id', updateAccount);
  app.delete('/channex/accounts/:id', deleteAccount);
  app.post('/channex/accounts/:id/test', testAccountConnection);

  // Sync (per account)
  app.post('/channex/accounts/:accountId/sync-property', syncPropertyToChannex);
  app.post('/channex/accounts/:accountId/sync-rooms', syncRoomsToChannex);
  app.post('/channex/accounts/:accountId/sync-rate-plans', syncRatePlansToChannex);
  app.post('/channex/accounts/:accountId/full-sync', fullSync);

  // Mappings
  app.get('/channex/accounts/:accountId/mappings', listMappings);

  // Channel connections
  app.post('/channex/accounts/:accountId/channels', createChannelConnection);
  app.get('/channex/accounts/:accountId/channels', listChannelConnections);

  // Listing connections
  app.post('/channex/listings', createListingConnection);
  app.get('/channex/accounts/:accountId/listings', listListingConnections);

  logInfo('[Channex Sync] Fase 2 routes registered');
}
