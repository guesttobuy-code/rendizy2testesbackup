

/**
 * POST /staysnet/sync/owners
 * Sync owners from Stays.net
 */
export async function syncStaysNetOwners(c: Context) {
  try {
    logInfo('Syncing owners from Stays.net');
    const organizationId = await getOrganizationIdOrThrow(c);
    const config = await kv.get<StaysNetConfig>('settings:staysnet');
    if (!config || !config.apiKey) {
      return c.json(errorResponse('Stays.net not configured'), 400);
    }
    const client = new StaysNetClient(config.apiKey, config.baseUrl, config.apiSecret);
    const { syncStaysNetOwners } = await import('./sync/staysnet-sync-owners.ts');
    const syncResult = await syncStaysNetOwners(client, organizationId);
    return c.json(successResponse({
      message: 'Owners synced successfully',
      stats: syncResult.stats,
      success: syncResult.success,
      timestamp: new Date().toISOString(),
    }));
  } catch (error) {
    logError('Error syncing Stays.net owners', error);
    return c.json(errorResponse('Failed to sync owners'), 500);
  }
}

/**
 * POST /staysnet/sync/calendar
 * Sync calendar (availability, blocks, rates) from Stays.net
 */
export async function syncStaysNetCalendar(c: Context) {
  try {
    const body = await c.req.json();
    const { propertyId, startDate, endDate } = body;
    logInfo('Syncing calendar from Stays.net');
    const organizationId = await getOrganizationIdOrThrow(c);
    const config = await kv.get<StaysNetConfig>('settings:staysnet');
    if (!config || !config.apiKey) {
      return c.json(errorResponse('Stays.net not configured'), 400);
    }
    const client = new StaysNetClient(config.apiKey, config.baseUrl, config.apiSecret);
    const { syncStaysNetCalendar } = await import('./sync/staysnet-sync-calendar.ts');
    const syncResult = await syncStaysNetCalendar(client, organizationId, propertyId, startDate, endDate);
    return c.json(successResponse({
      message: 'Calendar synced successfully',
      stats: syncResult.stats,
      success: syncResult.success,
      timestamp: new Date().toISOString(),
    }));
  } catch (error) {
    logError('Error syncing Stays.net calendar', error);
    return c.json(errorResponse('Failed to sync calendar'), 500);
  }
}

/**
 * POST /staysnet/sync/auto
 * Sincronização automática (verifica reservas novas, canceladas, atualiza calendário)
 */
export async function syncStaysNetAuto(c: Context) {
  try {
    logInfo('Starting automatic sync from Stays.net');
    const organizationId = await getOrganizationIdOrThrow(c);
    const config = await kv.get<StaysNetConfig>('settings:staysnet');
    if (!config || !config.apiKey) {
      return c.json(errorResponse('Stays.net not configured'), 400);
    }
    const client = new StaysNetClient(config.apiKey, config.baseUrl, config.apiSecret);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    const { fullSyncStaysNet } = await import('./sync/staysnet-full-sync.ts');
    const reservationsResult = await fullSyncStaysNet(
      client,
      organizationId,
      [],
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );
    const { syncStaysNetCalendar } = await import('./sync/staysnet-sync-calendar.ts');
    const calendarResult = await syncStaysNetCalendar(
      client,
      organizationId,
      undefined,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );
    return c.json(successResponse({
      message: 'Automatic sync completed',
      reservations: reservationsResult.stats,
      calendar: calendarResult.stats,
      success: reservationsResult.success && calendarResult.success,
      timestamp: new Date().toISOString(),
    }));
  } catch (error) {
    logError('Error in automatic sync', error);
    return c.json(errorResponse('Failed to sync automatically'), 500);
  }
}
