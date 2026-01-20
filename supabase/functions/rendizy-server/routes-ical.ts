import { Hono } from 'npm:hono';
import { tenancyMiddleware } from './utils-tenancy.ts';
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';
import { getSupabaseClient } from './kv_store.tsx';
import { parseIcalEvents, rangesOverlap, calcNights } from './utils-ical-parser.ts';
import type { Block } from './types.ts';
import { blockToSql } from './utils-block-mapper.ts';

const ICAL_USER_ID = '00000000-0000-0000-0000-000000000003';

const app = new Hono();

// ✅ Mesma proteção do resto do backend
app.use('*', tenancyMiddleware);

function normPlatform(p: string | undefined): string {
	const v = String(p || '').trim().toLowerCase();
	if (!v) return 'unknown';
	if (v.includes('airbnb')) return 'airbnb';
	if (v.includes('booking')) return 'booking';
	if (v.includes('decolar')) return 'decolar';
	if (v.includes('vrbo')) return 'vrbo';
	return v;
}

function buildReason(platform: string): string {
	if (platform === 'airbnb') return 'Reserva (Airbnb iCal)';
	if (platform === 'booking') return 'Reserva (Booking iCal)';
	if (platform === 'decolar') return 'Reserva (Decolar iCal)';
	if (platform === 'vrbo') return 'Reserva (Vrbo iCal)';
	return 'Reserva (iCal)';
}

/**
 * POST /ical/sync
 *
 * Sincroniza blocks (reservas externas) via iCal (.ics) das listings.
 * - Usa tabela `listings` (ical_url + sync_calendar)
 * - Escreve na tabela `blocks` (subtype: reservation)
 *
 * Body opcional:
 * - propertyId: sincronizar apenas uma propriedade
 * - platforms: ['airbnb','booking',...]
 * - from/to: limitar período (YYYY-MM-DD)
 * - debug: 1
 */
app.post('/sync', async (c) => {
	const supabase = getSupabaseClient();
	const organizationId = await getOrganizationIdOrThrow(c);

	const body: any = await c.req.json().catch(() => ({}));
	const debug = String(c.req.query('debug') || body?.debug || '') === '1';
	const propertyId = String(body?.propertyId || body?.property_id || '').trim() || undefined;
	const platforms = Array.isArray(body?.platforms) ? body.platforms.map((p: any) => normPlatform(p)) : undefined;

	const fromDefault = new Date();
	fromDefault.setMonth(fromDefault.getMonth() - 12);
	const toDefault = new Date();
	toDefault.setMonth(toDefault.getMonth() + 12);
	const from = String(body?.from || body?.startDate || fromDefault.toISOString().slice(0, 10));
	const to = String(body?.to || body?.endDate || toDefault.toISOString().slice(0, 10));

	let listingsQuery = supabase
		.from('listings')
		.select('id, platform, property_id, ical_url, sync_calendar')
		.eq('organization_id', organizationId)
		.eq('sync_calendar', true)
		.not('ical_url', 'is', null);

	if (propertyId) listingsQuery = listingsQuery.eq('property_id', propertyId);
	if (platforms?.length) listingsQuery = listingsQuery.in('platform', platforms);

	const { data: listings, error: listingsError } = await listingsQuery;
	if (listingsError) {
		return c.json({ success: false, error: listingsError.message }, 500);
	}

	const stats = {
		listings: listings?.length || 0,
		fetchedEvents: 0,
		considered: 0,
		saved: 0,
		updated: 0,
		skipped: 0,
		errors: 0,
	};

	const errorDetails: Array<{ listingId: string; error: string }> = [];

	for (const listing of listings || []) {
		const listingId = String(listing.id);
		const platform = normPlatform(listing.platform);
		const icalUrl = String(listing.ical_url || '').trim();
		const propId = String(listing.property_id);

		if (!icalUrl || !propId) {
			stats.skipped++;
			continue;
		}

		try {
			const resp = await fetch(icalUrl, { headers: { Accept: 'text/calendar, text/plain, */*' } });
			if (!resp.ok) {
				throw new Error(`Falha ao baixar iCal: ${resp.status} ${await resp.text()}`);
			}

			const ics = await resp.text();
			const events = parseIcalEvents(ics)
				.filter((e) => e.status !== 'CANCELLED');

			stats.fetchedEvents += events.length;

			for (const ev of events) {
				// Limit by range overlap
				if (!rangesOverlap(ev.startDate, ev.endDate, from, to)) {
					stats.skipped++;
					continue;
				}

				const nights = calcNights(ev.startDate, ev.endDate);
				if (nights < 1) {
					stats.skipped++;
					continue;
				}

				stats.considered++;

				const now = new Date().toISOString();
				const block: Block = {
					id: crypto.randomUUID(),
					propertyId: propId,
					startDate: ev.startDate,
					endDate: ev.endDate,
					nights,
					type: 'block',
					subtype: 'reservation',
					reason: buildReason(platform),
					notes: debug
						? JSON.stringify({
								source: 'ical',
								platform,
								listingId,
								uid: ev.uid,
								summary: ev.summary,
							})
						: undefined,
					createdAt: now,
					updatedAt: now,
					createdBy: ICAL_USER_ID,
				};

				// Idempotência simples: mesmo período + subtype => update (sem duplicar)
				const { data: existing, error: existErr } = await supabase
					.from('blocks')
					.select('id')
					.eq('organization_id', organizationId)
					.eq('property_id', propId)
					.eq('start_date', ev.startDate)
					.eq('end_date', ev.endDate)
					.eq('subtype', 'reservation')
					.maybeSingle();

				if (existErr) {
					throw new Error(`Erro verificando duplicação blocks: ${existErr.message}`);
				}

				if (existing?.id) {
					const patch = {
						reason: block.reason,
						notes: block.notes || null,
						updated_at: now,
					};

					const { error: updErr } = await supabase
						.from('blocks')
						.update(patch)
						.eq('id', existing.id)
						.eq('organization_id', organizationId);

					if (updErr) {
						throw new Error(`Erro atualizando block existente: ${updErr.message}`);
					}

					stats.updated++;
					continue;
				}

				const sql = blockToSql(block, organizationId);
				const { error: insErr } = await supabase.from('blocks').insert(sql);
				if (insErr) {
					throw new Error(`Erro inserindo block: ${insErr.message}`);
				}
				stats.saved++;
			}
		} catch (e: any) {
			stats.errors++;
			errorDetails.push({ listingId, error: e?.message || String(e) });
		}
	}

	return c.json({
		success: stats.errors === 0,
		method: 'ical-sync',
		range: { from, to },
		stats,
		errorDetails: stats.errors ? errorDetails : undefined,
	});
});

export default app;

