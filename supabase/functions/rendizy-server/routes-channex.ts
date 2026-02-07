/**
 * Channex API Routes
 * 
 * Endpoints for Channex Channel Manager integration
 * 
 * Routes:
 * - POST /channex/test-connection - Test API connection
 * - GET /channex/properties - List properties from Channex
 * - GET /channex/room-types - List room types
 * - GET /channex/rate-plans - List rate plans
 * - GET /channex/channels - List available OTA channels
 * - POST /channex/sync-property - Sync a Rendizy property to Channex
 */

import { Context } from 'npm:hono';
import { successResponse, errorResponse, logInfo, logError } from './utils.ts';
import { getChannexClient, mapCurrencyToChannex, mapCountryToISO } from './utils-channex.ts';
import { getSupabaseClient } from './kv_store.tsx';
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';
import { CHANNEX_API_TOKEN, CHANNEX_ENVIRONMENT } from './utils-env.ts';

// ============================================================================
// TEST CONNECTION
// ============================================================================

/**
 * POST /channex/test-connection
 * 
 * Test the connection to Channex API
 * Can optionally provide credentials in body to test specific credentials
 */
export async function testConnection(c: Context) {
  try {
    const body = await c.req.json().catch(() => ({}));
    
    // Use provided credentials or fall back to env
    const apiToken = body.apiToken || CHANNEX_API_TOKEN;
    const environment = body.environment || CHANNEX_ENVIRONMENT;
    
    if (!apiToken) {
      return errorResponse('No API token provided. Configure CHANNEX_API_TOKEN or pass apiToken in body.');
    }

    const client = getChannexClient({
      apiToken,
      environment: environment as 'staging' | 'production',
    });

    logInfo('[Channex] Testing connection...');
    const result = await client.testConnection();

    if (result.success) {
      logInfo('[Channex] Connection successful', result.data);
      return successResponse({
        connected: true,
        environment: result.data?.environment,
        propertiesCount: result.data?.propertiesCount,
        message: 'Successfully connected to Channex API',
      });
    } else {
      logError('[Channex] Connection failed', result.error);
      return errorResponse(`Connection failed: ${result.error}`);
    }
  } catch (error) {
    logError('[Channex] Test connection error', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

// ============================================================================
// LIST PROPERTIES
// ============================================================================

/**
 * GET /channex/properties
 * 
 * List all properties from Channex account
 */
export async function listProperties(c: Context) {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '25');

    const client = getChannexClient();
    
    if (!client.isConfigured()) {
      return errorResponse('Channex API not configured. Set CHANNEX_API_TOKEN.');
    }

    const result = await client.listProperties(page, limit);

    if (result.success) {
      return successResponse({
        properties: result.data?.data || [],
        meta: result.data?.meta,
      });
    } else {
      return errorResponse(result.error || 'Failed to list properties');
    }
  } catch (error) {
    logError('[Channex] List properties error', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

// ============================================================================
// LIST ROOM TYPES
// ============================================================================

/**
 * GET /channex/room-types
 * 
 * List room types from Channex
 * Optional filter by property_id
 */
export async function listRoomTypes(c: Context) {
  try {
    const propertyId = c.req.query('property_id');

    const client = getChannexClient();
    
    if (!client.isConfigured()) {
      return errorResponse('Channex API not configured. Set CHANNEX_API_TOKEN.');
    }

    const result = await client.listRoomTypes(propertyId);

    if (result.success) {
      return successResponse({
        roomTypes: result.data?.data || [],
        meta: result.data?.meta,
      });
    } else {
      return errorResponse(result.error || 'Failed to list room types');
    }
  } catch (error) {
    logError('[Channex] List room types error', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

// ============================================================================
// LIST RATE PLANS
// ============================================================================

/**
 * GET /channex/rate-plans
 * 
 * List rate plans from Channex
 * Optional filter by room_type_id
 */
export async function listRatePlans(c: Context) {
  try {
    const roomTypeId = c.req.query('room_type_id');

    const client = getChannexClient();
    
    if (!client.isConfigured()) {
      return errorResponse('Channex API not configured. Set CHANNEX_API_TOKEN.');
    }

    const result = await client.listRatePlans(roomTypeId);

    if (result.success) {
      return successResponse({
        ratePlans: result.data?.data || [],
        meta: result.data?.meta,
      });
    } else {
      return errorResponse(result.error || 'Failed to list rate plans');
    }
  } catch (error) {
    logError('[Channex] List rate plans error', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

// ============================================================================
// LIST CHANNELS (OTAs)
// ============================================================================

/**
 * GET /channex/channels
 * 
 * List available OTA channels from Channex
 */
export async function listChannels(c: Context) {
  try {
    const client = getChannexClient();
    
    if (!client.isConfigured()) {
      return errorResponse('Channex API not configured. Set CHANNEX_API_TOKEN.');
    }

    const result = await client.listChannels();

    if (result.success) {
      return successResponse({
        channels: result.data?.data || [],
        meta: result.data?.meta,
      });
    } else {
      return errorResponse(result.error || 'Failed to list channels');
    }
  } catch (error) {
    logError('[Channex] List channels error', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

// ============================================================================
// GET STATUS
// ============================================================================

/**
 * GET /channex/status
 * 
 * Get current Channex configuration status
 */
export async function getStatus(c: Context) {
  try {
    const client = getChannexClient();
    
    const configured = client.isConfigured();
    const credentials = client.getCredentials();

    const status = {
      configured,
      environment: credentials.environment,
      baseUrl: credentials.baseUrl,
      apiTokenPresent: !!credentials.apiToken,
      apiTokenLength: credentials.apiToken?.length || 0,
    };

    // If configured, test the connection
    if (configured) {
      const testResult = await client.testConnection();
      return successResponse({
        ...status,
        connectionTest: {
          success: testResult.success,
          propertiesCount: testResult.data?.propertiesCount,
          error: testResult.error,
        },
      });
    }

    return successResponse(status);
  } catch (error) {
    logError('[Channex] Get status error', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

// ============================================================================
// SYNC PROPERTY TO CHANNEX
// ============================================================================

/**
 * POST /channex/sync-property
 * 
 * @deprecated Use POST /channex/accounts/:accountId/sync-property instead (multi-account)
 * 
 * Legacy endpoint - Sync a Rendizy property to Channex using env credentials.
 * Kept for backward compatibility. New code should use the multi-account routes.
 */
export async function syncProperty(c: Context) {
  try {
    const supabase = getSupabaseClient(c);
    const organizationId = await getOrganizationIdOrThrow(c);
    const body = await c.req.json();

    const { propertyId, channexPropertyId } = body;

    if (!propertyId) {
      return errorResponse('propertyId is required');
    }

    // Try to find an existing account for this org, or use env token
    const { data: existingAccount } = await supabase
      .from('channex_accounts')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (existingAccount) {
      // Redirect to new multi-account flow
      logInfo('[Channex] Legacy sync-property redirecting to account-based flow');
      return errorResponse(
        `Use POST /channex/accounts/${existingAccount.id}/sync-property instead. ` +
        `This org already has a Channex account configured.`
      );
    }

    // Fetch property from Rendizy
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('*')
      .eq('id', propertyId)
      .eq('organization_id', organizationId)
      .single();

    if (propertyError || !property) {
      return errorResponse(`Property not found: ${propertyError?.message || 'Unknown'}`);
    }

    const client = getChannexClient();
    
    if (!client.isConfigured()) {
      return errorResponse('Channex API not configured. Set CHANNEX_API_TOKEN.');
    }

    // Map Rendizy property to Channex format
    const propertyData = property.data || {};
    const address = propertyData.address || {};
    const pricing = propertyData.pricing || {};

    const channexData = {
      title: property.name || property.title || 'Unnamed Property',
      currency: mapCurrencyToChannex(pricing.currency || 'BRL'),
      timezone: 'America/Sao_Paulo', // TODO: Make configurable
      address: address.street || address.line1 || '',
      zip: address.postalCode || address.zipCode || '',
      city: address.city || '',
      country: mapCountryToISO(address.country || 'BR'),
      email: propertyData.contact?.email || '',
      phone: propertyData.contact?.phone || '',
      latitude: propertyData.location?.lat || propertyData.location?.latitude,
      longitude: propertyData.location?.lng || propertyData.location?.longitude,
    };

    let result;
    let action: 'created' | 'updated';

    if (channexPropertyId) {
      // Update existing property
      result = await client.updateProperty(channexPropertyId, channexData);
      action = 'updated';
    } else {
      // Create new property
      result = await client.createProperty(channexData);
      action = 'created';
    }

    if (result.success) {
      const newChannexId = result.data?.data?.id || channexPropertyId;

      // Store mapping in database
      if (newChannexId) {
        const { error: mappingError } = await supabase
          .from('channex_property_mappings')
          .upsert({
            organization_id: organizationId,
            rendizy_property_id: propertyId,
            channex_property_id: newChannexId,
            last_sync_at: new Date().toISOString(),
            sync_status: 'success',
          }, {
            onConflict: 'rendizy_property_id',
          });

        if (mappingError) {
          logError('[Channex] Failed to store mapping', mappingError);
        }
      }

      return successResponse({
        action,
        channexPropertyId: newChannexId,
        message: `Property ${action} successfully in Channex`,
        data: result.data,
      });
    } else {
      return errorResponse(`Failed to ${channexPropertyId ? 'update' : 'create'} property: ${result.error}`);
    }
  } catch (error) {
    logError('[Channex] Sync property error', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

// ============================================================================
// GET BOOKING FEED
// ============================================================================

/**
 * GET /channex/bookings/feed
 * 
 * Get booking feed (new/modified/cancelled bookings)
 */
export async function getBookingFeed(c: Context) {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '25');

    const client = getChannexClient();
    
    if (!client.isConfigured()) {
      return errorResponse('Channex API not configured. Set CHANNEX_API_TOKEN.');
    }

    const result = await client.getBookingFeed(page, limit);

    if (result.success) {
      return successResponse({
        bookings: result.data?.data || [],
        meta: result.data?.meta,
      });
    } else {
      return errorResponse(result.error || 'Failed to get booking feed');
    }
  } catch (error) {
    logError('[Channex] Get booking feed error', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

// ============================================================================
// ACKNOWLEDGE BOOKING
// ============================================================================

/**
 * POST /channex/bookings/:revisionId/ack
 * 
 * Acknowledge a booking revision
 */
export async function acknowledgeBooking(c: Context) {
  try {
    const revisionId = c.req.param('revisionId');

    if (!revisionId) {
      return errorResponse('revisionId is required');
    }

    const client = getChannexClient();
    
    if (!client.isConfigured()) {
      return errorResponse('Channex API not configured. Set CHANNEX_API_TOKEN.');
    }

    const result = await client.acknowledgeBooking(revisionId);

    if (result.success) {
      return successResponse({
        acknowledged: true,
        revisionId,
      });
    } else {
      return errorResponse(result.error || 'Failed to acknowledge booking');
    }
  } catch (error) {
    logError('[Channex] Acknowledge booking error', error);
    return errorResponse(error instanceof Error ? error.message : 'Unknown error');
  }
}

// ============================================================================
// ROUTE REGISTRATION
// ============================================================================

export function registerChannexRoutes(app: any) {
  // Status & Connection
  app.get('/channex/status', getStatus);
  app.post('/channex/test-connection', testConnection);
  
  // Properties
  app.get('/channex/properties', listProperties);
  app.post('/channex/sync-property', syncProperty);
  
  // Room Types & Rate Plans
  app.get('/channex/room-types', listRoomTypes);
  app.get('/channex/rate-plans', listRatePlans);
  
  // Channels (OTAs)
  app.get('/channex/channels', listChannels);
  
  // Bookings
  app.get('/channex/bookings/feed', getBookingFeed);
  app.post('/channex/bookings/:revisionId/ack', acknowledgeBooking);

  logInfo('[Channex] Routes registered');
}
