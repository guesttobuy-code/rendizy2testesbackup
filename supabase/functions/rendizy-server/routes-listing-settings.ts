import type { Context } from 'npm:hono';
import { getSupabaseClient } from './kv_store.tsx';
import { successResponse, errorResponse } from './utils-response.ts';
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';
import {
  DEFAULT_SETTINGS,
  DEFAULT_OVERRIDES,
  mergeSettings,
  normalizeOverrides,
  normalizeSettingsPayload,
} from './utils-settings.ts';

const pickSettingsSections = (payload: any) => {
  if (!payload || typeof payload !== 'object') return {};
  return {
    cancellation_policy: payload.cancellation_policy,
    checkin_checkout: payload.checkin_checkout,
    minimum_nights: payload.minimum_nights,
    advance_booking: payload.advance_booking,
    house_rules: payload.house_rules,
    communication: payload.communication,
  };
};

const buildEffectiveSettings = (globalSettings: any, listingSettings: any, overrides: any) => {
  const next: any = {};
  for (const section of Object.keys(DEFAULT_OVERRIDES)) {
    const isOverride = !!overrides?.[section];
    if (isOverride) {
      next[section] = listingSettings?.[section] ?? globalSettings?.[section];
    } else {
      next[section] = globalSettings?.[section];
    }
  }
  return mergeSettings(DEFAULT_SETTINGS, next);
};

export async function getListingSettings(c: Context) {
  try {
    const listingId = c.req.param('id');
    const client = getSupabaseClient();
    const orgId = await getOrganizationIdOrThrow(c);

    const { data: globalRow } = await client
      .from('organization_settings')
      .select('settings')
      .eq('organization_id', orgId)
      .maybeSingle();

    const { data: listingRow } = await client.from('listing_settings').select('id, listing_id, organization_id, overrides, settings, created_at, updated_at').eq('organization_id', orgId).eq('listing_id', listingId).maybeSingle();

    const globalSettings = mergeSettings(DEFAULT_SETTINGS, globalRow?.settings ?? null);
    const overrides = normalizeOverrides(listingRow?.overrides ?? null);
    const listingSettings = mergeSettings(DEFAULT_SETTINGS, listingRow?.settings ?? null);
    const effective = buildEffectiveSettings(globalSettings, listingSettings, overrides);

    return c.json(
      successResponse({
        id: listingRow?.id ?? null,
        listing_id: listingId,
        organization_id: orgId,
        overrides,
        ...listingSettings,
        effective,
      })
    );
  } catch (error) {
    return c.json(errorResponse(error instanceof Error ? error.message : 'Failed to fetch listing settings'), 500);
  }
}

export async function updateListingSettings(c: Context) {
  try {
    const listingId = c.req.param('id');
    const client = getSupabaseClient();
    const orgId = await getOrganizationIdOrThrow(c);
    const body = await c.req.json();

    const { data: existingRow } = await client
      .from('listing_settings')
      .select('id, overrides, settings')
      .eq('organization_id', orgId)
      .eq('listing_id', listingId)
      .maybeSingle();

    const overrides = normalizeOverrides({
      ...DEFAULT_OVERRIDES,
      ...(existingRow?.overrides ?? {}),
      ...(body?.overrides ?? {}),
    });

    const existingSettings = mergeSettings(DEFAULT_SETTINGS, existingRow?.settings ?? null);
    const patch = pickSettingsSections(body);
    const normalizedPatch = normalizeSettingsPayload(patch);
    const nextSettings = mergeSettings(existingSettings, normalizedPatch);

    const { data: savedRow, error } = await client
      .from('listing_settings')
      .upsert(
        {
          organization_id: orgId,
          listing_id: listingId,
          overrides,
          settings: nextSettings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id,listing_id' }
      )
      .select('id, listing_id, organization_id, overrides, settings, created_at, updated_at')
      .maybeSingle();

    if (error) return c.json(errorResponse(error.message), 500);

    const { data: globalRow } = await client
      .from('organization_settings')
      .select('settings')
      .eq('organization_id', orgId)
      .maybeSingle();

    const globalSettings = mergeSettings(DEFAULT_SETTINGS, globalRow?.settings ?? null);
    const effective = buildEffectiveSettings(globalSettings, nextSettings, overrides);

    return c.json(
      successResponse({
        id: savedRow?.id ?? null,
        listing_id: listingId,
        organization_id: orgId,
        overrides,
        ...nextSettings,
        effective,
      })
    );
  } catch (error) {
    return c.json(errorResponse(error instanceof Error ? error.message : 'Failed to update listing settings'), 500);
  }
}

export async function toggleListingOverride(c: Context) {
  try {
    const listingId = c.req.param('id');
    const client = getSupabaseClient();
    const orgId = await getOrganizationIdOrThrow(c);
    const body = await c.req.json();

    const section = String(body?.section || '').trim();
    const enabled = !!body?.enabled;

    if (!section || !(section in DEFAULT_OVERRIDES)) {
      return c.json(errorResponse('Invalid section'), 400);
    }

    const { data: existingRow } = await client
      .from('listing_settings')
      .select('id, overrides, settings')
      .eq('organization_id', orgId)
      .eq('listing_id', listingId)
      .maybeSingle();

    const overrides = normalizeOverrides({
      ...DEFAULT_OVERRIDES,
      ...(existingRow?.overrides ?? {}),
      [section]: enabled,
    });

    const { data: savedRow, error } = await client
      .from('listing_settings')
      .upsert(
        {
          organization_id: orgId,
          listing_id: listingId,
          overrides,
          settings: existingRow?.settings ?? DEFAULT_SETTINGS,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id,listing_id' }
      )
      .select('id, listing_id, organization_id, overrides, settings, created_at, updated_at')
      .maybeSingle();

    if (error) return c.json(errorResponse(error.message), 500);

    return c.json(successResponse(savedRow ?? null));
  } catch (error) {
    return c.json(errorResponse(error instanceof Error ? error.message : 'Failed to toggle override'), 500);
  }
}

export async function resetListingSettings(c: Context) {
  try {
    const listingId = c.req.param('id');
    const client = getSupabaseClient();
    const orgId = await getOrganizationIdOrThrow(c);

    const { error } = await client
      .from('listing_settings')
      .delete()
      .eq('organization_id', orgId)
      .eq('listing_id', listingId);

    if (error) return c.json(errorResponse(error.message), 500);

    return c.json(successResponse({ ok: true }));
  } catch (error) {
    return c.json(errorResponse(error instanceof Error ? error.message : 'Failed to reset listing settings'), 500);
  }
}

export async function listOrganizationListingSettings(c: Context) {
  try {
    const client = getSupabaseClient();
    const orgId = await getOrganizationIdOrThrow(c);

    const { data, error } = await client
      .from('listing_settings')
      .select('listing_id, overrides, settings')
      .eq('organization_id', orgId);

    if (error) return c.json(errorResponse(error.message), 500);

    return c.json(successResponse({ items: data ?? [] }));
  } catch (error) {
    return c.json(errorResponse(error instanceof Error ? error.message : 'Failed to list listing settings'), 500);
  }
}
