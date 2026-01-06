// ⚠️ Cápsula de segurança: pipeline de webhooks do Stays.net.
//
// Objetivo: impedir que alterações no “import modal” afetem o robô de webhooks
// (e vice-versa) via imports/rotas acidentais.
//
// Regra:
// - Entry points (receiver/cron/index.ts) DEVEM importar deste arquivo.
// - Evitar importar direto de routes-staysnet.ts fora do rendizy-server.
//
// Governança: ver docs/04-modules/STAYSNET_INTEGRATION_GOVERNANCE.md

import { Context } from 'npm:hono';
import { getSupabaseClient } from './kv_store.tsx';
import { successResponse, errorResponse, logError } from './utils.ts';
import * as staysnetDB from './staysnet-db.ts';
import { loadStaysNetRuntimeConfigOrThrow } from './utils-staysnet-config.ts';
import { resolveOrCreateGuestIdFromStaysReservation } from './utils-staysnet-guest-link.ts';
import type { Block, BlockSubtype } from './types.ts';
import { blockToSql } from './utils-block-mapper.ts';

/**
 * POST /staysnet/webhook/:organizationId
 * Receiver simples para notificações do Stays.net.
 *
 * Observação: a documentação menciona `x-stays-signature`, porém não define
 * aqui o algoritmo de verificação. Por segurança, persistimos headers + payload
 * para posterior validação/processing.
 */
export async function receiveStaysNetWebhook(c: Context) {
  try {
    const { organizationId } = c.req.param();
    if (!organizationId) {
      return c.json(errorResponse('organizationId is required'), 400);
    }

    const clientId = c.req.header('x-stays-client-id') || null;
    const signature = c.req.header('x-stays-signature') || null;

    // Sempre capturar o body RAW como texto para permitir verificação de assinatura.
    // (Hono/Deno Request body é consumível 1x)
    const rawText = await c.req.text();

    let body: any = rawText;
    try {
      body = JSON.parse(rawText);
    } catch {
      // manter como string
    }

    const action = typeof body === 'object' && body ? String(body.action || 'unknown') : 'unknown';
    const payload = typeof body === 'object' && body ? (body.payload ?? body) : body;
    const dt = typeof body === 'object' && body ? (body._dt ?? null) : null;

    const verifyEnabled = String(Deno.env.get('STAYSNET_WEBHOOK_VERIFY_SIGNATURE') || '')
      .trim()
      .toLowerCase() === 'true';
    const webhookSecret = String(Deno.env.get('STAYSNET_WEBHOOK_SECRET') || '').trim();

    let signatureVerified: boolean | null = null;
    let signatureReason: string | null = null;
    if (verifyEnabled) {
      if (!webhookSecret) {
        signatureVerified = null;
        signatureReason = 'verify_enabled_but_secret_missing';
      } else if (!signature) {
        signatureVerified = false;
        signatureReason = 'missing_signature_header';
      } else {
        try {
          signatureVerified = await verifyStaysNetWebhookSignature(signature, webhookSecret, rawText);
          signatureReason = signatureVerified ? 'ok' : 'mismatch';
        } catch (e: any) {
          signatureVerified = false;
          signatureReason = e?.message || 'verification_error';
        }
      }
    }

    const save = await staysnetDB.saveStaysNetWebhookDB(
      organizationId,
      action,
      payload,
      {
        received_dt: dt,
        headers: {
          'x-stays-client-id': clientId,
          'x-stays-signature': signature,
          'user-agent': c.req.header('user-agent') || null,
        },
        signature_verification: {
          enabled: verifyEnabled,
          verified: signatureVerified,
          reason: signatureReason,
        },
      },
    );

    if (!save.success) {
      return c.json(errorResponse(save.error || 'Failed to save webhook'), 500);
    }

    // Se verificação estiver habilitada e falhar, marcar como processado e retornar erro.
    if (verifyEnabled) {
      if (!webhookSecret) {
        await staysnetDB.markWebhookProcessedDB(save.id!, 'Signature verify enabled but secret missing');
        return c.json(errorResponse('Webhook signature verification misconfigured'), 500);
      }

      if (!signature) {
        await staysnetDB.markWebhookProcessedDB(save.id!, 'Missing x-stays-signature');
        return c.json(errorResponse('Missing webhook signature'), 401);
      }

      if (signatureVerified === false) {
        await staysnetDB.markWebhookProcessedDB(save.id!, 'Invalid webhook signature');
        return c.json(errorResponse('Invalid webhook signature'), 401);
      }
    }

    // 🚀 Realtime: processar a fila imediatamente (sem bloquear o response).
    // Em Supabase Edge Functions + Hono, `c.executionCtx.waitUntil` mantém o trabalho rodando.
    // Se não existir ExecutionContext (ambientes diferentes), apenas retorna e o cron consumirá.
    const realtimeEnabled = String(Deno.env.get('STAYSNET_WEBHOOK_REALTIME_PROCESS') || 'true')
      .trim()
      .toLowerCase() === 'true';
    const realtimeLimit = Math.max(
      1,
      Math.min(50, Number(Deno.env.get('STAYSNET_WEBHOOK_REALTIME_LIMIT') || 10)),
    );

    if (realtimeEnabled) {
      const execCtx: any = (c as any).executionCtx;
      if (execCtx && typeof execCtx.waitUntil === 'function') {
        execCtx.waitUntil(
          processPendingStaysNetWebhooksForOrg(organizationId, realtimeLimit).catch((e: any) => {
            console.error('[StaysNet Webhook] realtime process failed:', e?.message || String(e));
          }),
        );
      }
    }

    return c.json(successResponse({ id: save.id, received: true }));
  } catch (error) {
    logError('Error receiving Stays.net webhook', error);
    return c.json(errorResponse('Failed to receive webhook'), 500);
  }
}

function isHexString(value: string): boolean {
  return /^[0-9a-f]+$/i.test(value);
}

function bytesFromHex(hex: string): Uint8Array {
  const clean = hex.trim().toLowerCase();
  if (clean.length % 2 !== 0) throw new Error('Invalid hex length');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesFromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function hmacSha256(secret: string, message: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return new Uint8Array(sig);
}

async function verifyStaysNetWebhookSignature(provided: string, secret: string, rawBodyText: string): Promise<boolean> {
  const raw = String(provided || '').trim();
  if (!raw) throw new Error('empty_signature');

  // Aceitar formatos comuns: "sha256=<hex>", "hmac-sha256=<hex/base64>", ou apenas valor.
  const cleaned = raw
    .replace(/^sha256=/i, '')
    .replace(/^hmac-sha256=/i, '')
    .trim();

  const computed = await hmacSha256(secret, rawBodyText);

  // Comparar como hex ou base64 conforme input.
  if (isHexString(cleaned)) {
    const expected = bytesFromHex(cleaned);
    return constantTimeEqual(expected, computed);
  }

  // Base64 (ou outro formato): tentar base64 estrito.
  const expectedB64 = bytesFromBase64(cleaned);
  return constantTimeEqual(expectedB64, computed);
}

function safeInt(value: any, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n);
}

function parseMoney(value: any, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;

  if (typeof value === 'object') {
    const candidates = [
      (value as any)._f_total,
      (value as any)._f_val,
      (value as any).total,
      (value as any).amount,
      (value as any).value,
      (value as any).price,
      (value as any).grandTotal,
      (value as any).grand_total,
    ];
    for (const c of candidates) {
      const n = parseMoney(c, Number.NaN);
      if (Number.isFinite(n)) return n;
    }
    return fallback;
  }

  if (typeof value === 'string') {
    let s = value.trim();
    if (!s) return fallback;
    s = s.replace(/[^0-9,.-]/g, '');
    if (!s) return fallback;
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    const decimalSep = lastComma > lastDot ? ',' : '.';
    if (decimalSep === ',') {
      s = s.replace(/\./g, '').replace(/,/g, '.');
    } else {
      s = s.replace(/,/g, '');
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : fallback;
  }

  return fallback;
}

function parseMoneyInt(value: any, fallback = 0): number {
  const n = parseMoney(value, Number.NaN);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n);
}

function pickMoneyFromObject(obj: any, keys: string[], fallback = Number.NaN): number {
  if (!obj || typeof obj !== 'object') return fallback;
  for (const k of keys) {
    if (k in obj) {
      const n = parseMoney((obj as any)[k], Number.NaN);
      if (Number.isFinite(n)) return n;
    }
  }
  return fallback;
}

function mapReservationStatus(staysStatus: string | undefined): string {
  if (!staysStatus) return 'pending';
  const v = String(staysStatus).trim().toLowerCase();
  const map: Record<string, string> = {
    pending: 'pending',
    inquiry: 'pending',
    confirmed: 'confirmed',
    checked_in: 'checked_in',
    checked_out: 'checked_out',
    cancelled: 'cancelled',
    canceled: 'cancelled',
    // PT-BR (UI Stays)
    cancelada: 'cancelled',
    cancelado: 'cancelled',
    declined: 'cancelled',
    expired: 'cancelled',
    no_show: 'no_show',
  };
  return map[v] || 'pending';
}

function deriveReservationStatus(input: { type?: string; status?: string }): string {
  const typeLower = String(input.type || '').trim().toLowerCase();
  if (typeLower === 'canceled' || typeLower === 'cancelled' || typeLower === 'cancelada' || typeLower === 'cancelado') return 'cancelled';
  if (typeLower === 'no_show') return 'no_show';

  const fromStatus = mapReservationStatus(input.status);
  if (fromStatus === 'pending') {
    if (typeLower === 'booked' || typeLower === 'contract') return 'confirmed';
    if (typeLower === 'reserved') return 'pending';
    // PT-BR (UI Stays)
    if (typeLower === 'reserva' || typeLower === 'contrato') return 'confirmed';
    if (typeLower === 'pré-reserva' || typeLower === 'pre-reserva' || typeLower === 'prereserva') return 'pending';
  }
  return fromStatus;
}

function isStaysBlockLikeType(rawType: any): boolean {
  const t = String(rawType || '').trim().toLowerCase();
  if (!t) return false;

  // Canonical known values
  if (
    t === 'blocked' ||
    t === 'maintenance' ||
    t === 'unavailable' ||
    t === 'owner_block' ||
    t === 'ownerblock'
  ) {
    return true;
  }

  // PT-BR / UI variants
  if (
    t === 'bloqueado' ||
    t === 'bloqueio' ||
    t === 'indisponivel' ||
    t === 'indisponível' ||
    t === 'manutenção' ||
    t === 'manutencao'
  ) {
    return true;
  }

  // Defensive: some payloads use compound tokens
  if (t.includes('maintenance') || t.includes('manut')) return true;
  if (t.includes('owner') && t.includes('block')) return true;
  if (t.includes('bloq')) return true;
  if (t === 'block') return true;

  return false;
}

function mapBlockSubtypeFromStaysType(rawType: any): BlockSubtype {
  const t = String(rawType || '').trim().toLowerCase();
  if (t === 'maintenance' || t === 'manutenção' || t === 'manutencao') return 'maintenance';
  return 'simple';
}

function buildBlockReasonFromStaysType(rawType: any): string {
  const t = String(rawType || '').trim().toLowerCase();
  if (t === 'maintenance' || t === 'manutenção' || t === 'manutencao') return 'Manutenção (Stays.net)';
  return 'Bloqueio (Stays.net)';
}

function toYmd(value: any): string | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.split('T')[0];
}

function calcNightsYmd(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function mapPaymentStatus(raw: string | undefined, fallback: string = 'pending'): string {
  if (!raw) return fallback;
  const v = String(raw).trim().toLowerCase();
  const map: Record<string, string> = {
    pending: 'pending',
    paid: 'paid',
    completed: 'paid',
    partial: 'partial',
    partially_paid: 'partial',
    refunded: 'refunded',
    refund: 'refunded',
  };
  return map[v] || fallback;
}

function mapPlatformFromRaw(input: unknown): string {
  if (!input) return '';
  const token = (() => {
    if (typeof input === 'string' || typeof input === 'number' || typeof input === 'boolean') return String(input);
    if (typeof input === 'object') {
      const v: any = input as any;
      return [v?.name, v?.code, v?.platform, v?.source].filter(Boolean).map(String).join(' ');
    }
    return String(input);
  })();
  const s = token.toLowerCase();
  if (s.includes('airbnb')) return 'airbnb';
  if (s.includes('booking')) return 'booking';
  if (s.includes('decolar')) return 'decolar';
  if (s.includes('direct')) return 'direct';
  return '';
}

function derivePlatformFromStaysReservation(input: any, existingPlatform?: string | null): string {
  const existing = String(existingPlatform || '').trim();
  if (existing && existing !== 'other') return existing;

  const candidates = [
    input?.platform,
    input?.source,
    input?.partner,
    input?.partnerName,
    input?.partnerCode,
    input?.ota,
    input?.channel,
    input?.channelName,
    input?.origin,
  ];

  for (const c of candidates) {
    const mapped = mapPlatformFromRaw(c);
    if (mapped) return mapped;
  }

  // Fallback conservador: a maioria das reservas do Stays é "direct"
  return 'direct';
}

function parseOptionalDateToIso(value: any): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

async function resolveAnuncioDraftIdFromStaysId(
  supabase: ReturnType<typeof getSupabaseClient>,
  organizationId: string,
  staysId: string,
): Promise<string | null> {
  const lookups: Array<{ label: string; needle: any }> = [
    { label: 'data.externalIds.staysnet_property_id', needle: { externalIds: { staysnet_property_id: staysId } } },
    { label: 'data.externalIds.staysnet_listing_id', needle: { externalIds: { staysnet_listing_id: staysId } } },
    { label: 'data.staysnet_raw._id', needle: { staysnet_raw: { _id: staysId } } },
    { label: 'data.staysnet_raw.id', needle: { staysnet_raw: { id: staysId } } },
    { label: 'data.codigo', needle: { codigo: staysId } },
  ];

  for (const l of lookups) {
    const { data: row, error } = await supabase
      .from('properties')
      .select('id')
      .eq('organization_id', organizationId)
      .contains('data', l.needle)
      .maybeSingle();

    if (error) {
      console.warn(`⚠️ [StaysNet Webhook] Erro ao buscar properties via ${l.label}: ${error.message}`);
      continue;
    }

    if (row?.id) return row.id;
  }

  return null;
}

function unwrapStaysWebhookPayloadLike(input: any): any {
  if (!input || typeof input !== 'object') return input;

  // Common webhook envelopes
  const obj: any = input;
  if (obj.payload && typeof obj.payload === 'object') return obj.payload;
  if (obj.data && typeof obj.data === 'object') return obj.data;

  // Some providers nest under reservation
  if (obj.reservation && typeof obj.reservation === 'object') return obj.reservation;
  if (obj.booking && typeof obj.booking === 'object') return obj.booking;

  return obj;
}

function extractListingCandidateFromStaysReservation(input: any): string | null {
  const r = unwrapStaysWebhookPayloadLike(input);
  if (!r || typeof r !== 'object') return null;

  const direct =
    r?._idlisting ??
    r?._id_listing ??
    r?.idlisting ??
    r?.id_listing ??
    r?.listingId ??
    r?.listing_id ??
    r?.propertyId ??
    r?.property_id ??
    r?._idproperty ??
    r?._id_property ??
    r?.idproperty ??
    r?.id_property ??
    null;
  if (direct) return String(direct);

  const nestedListing = r?.listing ?? r?.property ?? r?.apartment ?? r?.unit ?? null;
  if (nestedListing && typeof nestedListing === 'object') {
    const nested =
      nestedListing?._id ??
      nestedListing?.id ??
      nestedListing?._idlisting ??
      nestedListing?.listingId ??
      nestedListing?.listing_id ??
      nestedListing?.propertyId ??
      nestedListing?.property_id ??
      nestedListing?.code ??
      null;
    if (nested) return String(nested);
  }

  // Alguns payloads podem vir envelopados em staysnet_raw
  const raw = r?.staysnet_raw;
  if (raw && typeof raw === 'object') {
    const fromRaw =
      raw?._idlisting ??
      raw?._id_listing ??
      raw?.listingId ??
      raw?.listing_id ??
      raw?.propertyId ??
      raw?.property_id ??
      null;
    if (fromRaw) return String(fromRaw);
  }

  return null;
}

function extractReservationIdFromPayload(payload: any): string | null {
  const p = unwrapStaysWebhookPayloadLike(payload);
  const candidates = [
    p?._id,
    p?.reservationId,
    p?.reserveId,
    p?.id,
    p?._idreservation,
    p?._id_reservation,
    p?.idreservation,
    p?.id_reservation,
    p?.confirmationCode,
    p?.partnerCode,
    p?.reservation?._id,
    p?.reservation?.id,
    p?.reservation?.confirmationCode,
  ].filter(Boolean);

  if (candidates.length === 0) return null;
  return String(candidates[0]);
}

function extractReservationIdCandidatesFromPayload(payload: any): string[] {
  const p = unwrapStaysWebhookPayloadLike(payload);
  const raw = [
    p?._id,
    p?.id,
    p?.reservationId,
    p?.reserveId,
    p?._idreservation,
    p?._id_reservation,
    p?.idreservation,
    p?.id_reservation,
    p?.confirmationCode,
    p?.partnerCode,
    p?.reservation?._id,
    p?.reservation?.id,
    p?.reservation?.confirmationCode,
  ]
    .filter(Boolean)
    .map((x) => String(x));
  return Array.from(new Set(raw));
}

function isCancellationAction(action: string): boolean {
  const a = String(action || '').trim().toLowerCase();
  if (a === 'reservation.canceled' || a === 'reservation.cancelled' || a === 'reservation.deleted') return true;
  // Defensive: some integrations send suffixed variants.
  if (a.startsWith('reservation.') && (a.endsWith('.deleted') || a.endsWith('.canceled') || a.endsWith('.cancelled'))) return true;
  return false;
}

function extractYmdRangeFromStaysLike(input: any): { startDate: string | null; endDate: string | null } {
  const r = unwrapStaysWebhookPayloadLike(input);
  const start = toYmd(r?.checkInDate ?? r?.checkIn ?? r?.check_in ?? r?.startDate ?? r?.start_date ?? null);
  const end = toYmd(r?.checkOutDate ?? r?.checkOut ?? r?.check_out ?? r?.endDate ?? r?.end_date ?? null);
  return { startDate: start, endDate: end };
}

async function deleteBlocksByNotesCandidates(opts: {
  supabase: ReturnType<typeof getSupabaseClient>;
  organizationId: string;
  candidates: string[];
  propertyId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}): Promise<number> {
  const { supabase, organizationId, candidates, propertyId, startDate, endDate } = opts;
  const ids = Array.from(new Set((candidates || []).filter(Boolean).map((x) => String(x).trim())));
  if (ids.length === 0) return 0;

  // We cannot OR multiple ilike in a single builder reliably; do it per-candidate.
  let deleted = 0;
  for (const id of ids.slice(0, 10)) {
    const patterns = [
      `%"reservationId":"${id}"%`,
      `%"_id":"${id}"%`,
      `%"id":"${id}"%`,
    ];

    for (const p of patterns) {
      let q = supabase
        .from('blocks')
        .delete()
        .eq('organization_id', organizationId)
        .ilike('notes', p)
        // Safety: our Stays blocks always set a Stays reason string
        .ilike('reason', '%Stays.net%')
        .select('id');

      if (propertyId) q = q.eq('property_id', propertyId);
      if (startDate) q = q.eq('start_date', startDate);
      if (endDate) q = q.eq('end_date', endDate);

      const { data, error } = await q;
      if (error) continue;
      deleted += (data || []).length;
    }
  }

  return deleted;
}

async function deleteBlocksByPropertyDates(opts: {
  supabase: ReturnType<typeof getSupabaseClient>;
  organizationId: string;
  propertyId: string;
  startDate: string;
  endDate: string;
  subtype?: BlockSubtype | null;
}): Promise<number> {
  const { supabase, organizationId, propertyId, startDate, endDate, subtype } = opts;

  let q = supabase
    .from('blocks')
    .delete()
    .eq('organization_id', organizationId)
    .eq('property_id', propertyId)
    .eq('start_date', startDate)
    .eq('end_date', endDate)
    // Safety: only remove blocks that were created by Stays integration
    .ilike('reason', '%Stays.net%')
    .select('id');

  if (subtype) q = q.eq('subtype', subtype);

  const { data, error } = await q;
  if (error) return 0;
  return (data || []).length;
}

async function findReservationsByCandidates(
  supabase: ReturnType<typeof getSupabaseClient>,
  organizationId: string,
  candidates: string[],
): Promise<any[]> {
  const ids = Array.from(new Set((candidates || []).filter(Boolean).map((x) => String(x))));
  if (ids.length === 0) return [];

  const found: any[] = [];
  const seen = new Set<string>();

  const tryQueries: Array<{ label: string; column: string }> = [
    { label: 'external_id', column: 'external_id' },
    { label: 'id', column: 'id' },
    { label: 'staysnet_reservation_code', column: 'staysnet_reservation_code' },
  ];

  for (const q of tryQueries) {
    const res = await supabase
      .from('reservations')
      .select('id, external_id, staysnet_reservation_code, staysnet_type, staysnet_raw')
      .eq('organization_id', organizationId)
      .in(q.column as any, ids)
      .limit(25);

    if (res.error) {
      console.warn(`[StaysNet Webhook] findReservationsByCandidates(${q.label}) failed:`, res.error.message);
      continue;
    }

    for (const row of res.data || []) {
      const key = String((row as any).id);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      found.push(row);
    }
  }

  return found;
}

async function applyCancellationForCandidates(
  supabase: ReturnType<typeof getSupabaseClient>,
  organizationId: string,
  candidates: string[],
): Promise<{ matched: number; cancelled: number; deletedBlocks: number }> {
  const rows = await findReservationsByCandidates(supabase, organizationId, candidates);
  if (rows.length === 0) return { matched: 0, cancelled: 0, deletedBlocks: 0 };

  let cancelled = 0;
  let deletedBlocks = 0;
  const nowIso = new Date().toISOString();

  for (const r of rows) {
    const isBlocked =
      isStaysBlockLikeType((r as any).staysnet_type) ||
      isStaysBlockLikeType((r as any).staysnet_raw?.type);

    if (isBlocked) {
      const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('organization_id', organizationId)
        .eq('id', (r as any).id);
      if (error) {
        console.warn('[StaysNet Webhook] Failed to delete block reservation:', error.message);
      } else {
        deletedBlocks++;
      }
      continue;
    }

    const { error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled', cancelled_at: nowIso })
      .eq('organization_id', organizationId)
      .eq('id', (r as any).id);
    if (error) {
      console.warn('[StaysNet Webhook] Failed to mark cancelled:', error.message);
    } else {
      cancelled++;
    }
  }

  return { matched: rows.length, cancelled, deletedBlocks };
}

async function cleanupMisclassifiedBlockReservations(
  supabase: ReturnType<typeof getSupabaseClient>,
  organizationId: string,
  candidates: string[],
): Promise<number> {
  const rows = await findReservationsByCandidates(supabase, organizationId, candidates);
  if (rows.length === 0) return 0;

  const misclassified = rows.filter(
    (r) => isStaysBlockLikeType((r as any).staysnet_type) || isStaysBlockLikeType((r as any).staysnet_raw?.type),
  );

  let deleted = 0;
  for (const r of misclassified) {
    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', (r as any).id);
    if (!error) deleted++;
  }
  return deleted;
}

async function upsertBlockFromStaysReservation(
  supabase: ReturnType<typeof getSupabaseClient>,
  organizationId: string,
  propertyId: string,
  startDate: string,
  endDate: string,
  subtype: BlockSubtype,
  reason: string,
  staysMeta: any,
): Promise<{ created: boolean; id: string } | null> {
  const { data: existing, error: existingError } = await supabase
    .from('blocks')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('property_id', propertyId)
    .eq('start_date', startDate)
    .eq('end_date', endDate)
    .eq('subtype', subtype)
    .maybeSingle();

  if (existingError) {
    console.warn('[StaysNet Webhook] Failed to check existing block:', existingError.message);
  }

  const now = new Date().toISOString();
  const notes = JSON.stringify({ staysnet: staysMeta });

  if (existing?.id) {
    const { error: updErr } = await supabase
      .from('blocks')
      .update({ reason, notes, updated_at: now })
      .eq('organization_id', organizationId)
      .eq('id', existing.id);
    if (updErr) {
      console.warn('[StaysNet Webhook] Failed to update existing block:', updErr.message);
      return null;
    }
    return { created: false, id: existing.id };
  }

  const nights = Math.max(1, calcNightsYmd(startDate, endDate));
  const block: Block = {
    id: crypto.randomUUID(),
    propertyId,
    startDate,
    endDate,
    nights,
    type: 'block',
    subtype,
    reason,
    notes,
    createdAt: now,
    updatedAt: now,
    createdBy: DEFAULT_USER_ID,
  };

  const sqlData = blockToSql(block, organizationId);
  const { error: insErr } = await supabase.from('blocks').insert(sqlData);
  if (insErr) {
    console.warn('[StaysNet Webhook] Failed to insert block:', insErr.message);
    return null;
  }

  return { created: true, id: block.id };
}

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000002';

function mapStaysReservationToSql(
  input: any,
  organizationId: string,
  resolvedPropertyId: string | null,
  resolvedGuestId: string | null,
  existing?: any,
) {
  const checkInDate = input?.checkInDate || input?.checkIn || input?.check_in;
  const checkOutDate = input?.checkOutDate || input?.checkOut || input?.check_out;
  if (!checkInDate || !checkOutDate) {
    throw new Error('Reservation sem checkIn/checkOut');
  }

  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  const nights = safeInt(input?.nights, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
  if (nights < 1) throw new Error('Nights inválido');

  // ✅ Contrato canônico (multi-canal):
  // - `reservations.id` é SEMPRE um UUID interno do Rendizy (string)
  // - A identidade externa é (organization_id, platform, external_id)
  // - Para Stays, `external_id` preferencialmente é o `_id` interno (estável)
  const id = String(existing?.id || crypto.randomUUID());
  if (!id) throw new Error('Reservation sem id');

  const priceObj = input?.price || {};
  const currency = input?.currency || priceObj?.currency || 'BRL';

  const hostingDetails = priceObj?.hostingDetails || priceObj?.hosting_details || {};

  const hostingFees: unknown[] = Array.isArray((hostingDetails as any)?.fees) ? ((hostingDetails as any).fees as unknown[]) : [];
  const hostingFeesTotal = parseMoneyInt(
    hostingFees.reduce((acc, fee) => {
      if (!fee || typeof fee !== 'object') return acc;
      const v = pickMoneyFromObject(fee as any, ['_f_val', 'value', 'val', 'amount', 'price'], Number.NaN);
      const n = parseMoney(v, Number.NaN);
      return Number.isFinite(n) ? acc + n : acc;
    }, 0),
    0,
  );

  // OBS: em produção, os campos pricing_* são INTEGER. O Stays pode enviar decimais ("813.38"),
  // então normalizamos para inteiro (arredondado) para evitar erro de cast no Postgres.
  const pricePerNight = parseMoneyInt(
    input?.pricePerNight ??
      pickMoneyFromObject(hostingDetails, ['_f_nightPrice', 'nightPrice', 'pricePerNight', 'perNight', 'per_night'], Number.NaN) ??
      pickMoneyFromObject(priceObj, ['pricePerNight', 'price_per_night', 'perNight', 'per_night', '_f_nightPrice'], Number.NaN),
    0,
  );

  // `price._f_total` costuma vir como TOTAL final (inclui taxas). Para base/accommodation, preferimos `_f_expected`.
  const accommodationTotal = parseMoney(
    pickMoneyFromObject(priceObj, ['_f_expected', 'expected', 'expectedTotal', 'expected_total', 'accommodation', 'accommodationTotal', 'accommodation_total', 'subtotal', 'sub_total'], Number.NaN) ??
      pickMoneyFromObject(hostingDetails, ['_f_nightPrice', 'nightPrice', 'pricePerNight', 'perNight', 'per_night'], Number.NaN),
    Number.NaN,
  );

  const baseTotal = parseMoney(
    pickMoneyFromObject(priceObj, ['baseTotal', 'base_total', 'accommodation', 'accommodationTotal', 'accommodation_total', 'subtotal', 'sub_total'], Number.NaN) ??
      input?.price ??
      input?.baseTotal,
    Number.NaN,
  );

  const cleaningFeeFromFields = parseMoneyInt(
    input?.cleaningFee ??
      pickMoneyFromObject(priceObj, ['cleaningFee', 'cleaning_fee', 'cleaning'], Number.NaN),
    0,
  );
  const serviceFee = parseMoneyInt(
    input?.serviceFee ??
      pickMoneyFromObject(priceObj, ['serviceFee', 'service_fee', 'service'], Number.NaN),
    0,
  );
  const taxes = parseMoneyInt(
    input?.taxes ??
      pickMoneyFromObject(priceObj, ['taxes', 'tax', 'vat'], Number.NaN),
    0,
  );
  const discount = parseMoneyInt(
    input?.discount ??
      pickMoneyFromObject(priceObj, ['discount', 'discounts', 'coupon', 'promotion'], Number.NaN),
    0,
  );

  const resolvedBaseTotal = Number.isFinite(accommodationTotal)
    ? Math.round(accommodationTotal)
    : Number.isFinite(baseTotal)
      ? Math.round(baseTotal)
      : pricePerNight * nights;

  // Se não veio taxa explícita, tenta somar fees do hostingDetails.
  const cleaningFee = cleaningFeeFromFields > 0 ? cleaningFeeFromFields : hostingFeesTotal;

  const rawType = input?.type ?? input?.reservationType ?? input?.typeReservation ?? input?.tipo ?? input?.tipoReserva ?? null;
  const rawStatus =
    input?.status ??
    input?.reservationStatus ??
    input?.statusReservation ??
    input?.bookingStatus ??
    input?.status_reservation ??
    input?.reservation_status ??
    null;

  const derivedStatus = deriveReservationStatus({ type: rawType, status: rawStatus });

  const cancelledAtIso =
    parseOptionalDateToIso(
      input?.cancelledAt ??
        input?.canceledAt ??
        input?.cancellationDate ??
        input?.cancelDate ??
        input?.cancelled_at,
    ) ?? (derivedStatus === 'cancelled' ? new Date().toISOString() : null);

  const cancellationReason =
    input?.cancellationReason ?? input?.cancellation_reason ?? input?.cancelReason ?? input?.cancel_reason ?? null;

  // Guests
  const guestsDetails = input?.guestsDetails || input?.guests_details || input?.guests || {};
  const guestsAdults = safeInt(guestsDetails?.adults ?? input?.guests?.adults, 1) || 1;
  const guestsChildren = safeInt(guestsDetails?.children ?? input?.guests?.children, 0);
  const guestsInfants = safeInt(guestsDetails?.infants ?? input?.guests?.infants, 0);
  const guestsPets = safeInt(guestsDetails?.pets ?? input?.guests?.pets, 0);
  const guestsTotal = safeInt(guestsDetails?.total ?? input?.guests?.total, guestsAdults);

  // Guardar o id interno do Stays em `external_id` (para fetch/update via API), e o código curto em `id`.
  const externalId = String(input?._id || input?.reservationId || input?.reserveId || input?.id || id);
  const externalUrl = input?.reservationUrl || input?.url || input?.externalUrl || null;

  // Preferimos usar o resolvedPropertyId; se não existe, preserva existing.property_id.
  const finalPropertyId = resolvedPropertyId || existing?.property_id || null;
  const finalGuestId = resolvedGuestId || existing?.guest_id || null;

  // Totals
  const explicitTotal = parseMoney(
    pickMoneyFromObject(priceObj, ['_f_total', 'total', 'grandTotal', 'grand_total'], Number.NaN) ??
      input?.total,
    Number.NaN,
  );
  const computedTotal = resolvedBaseTotal + cleaningFee + serviceFee + taxes - discount;
  const total = Number.isFinite(explicitTotal) ? Math.round(explicitTotal) : computedTotal;

  const sourceCreatedAtIso = parseOptionalDateToIso(input?.createdAt ?? input?.created_at ?? input?._dt);

  return {
    id,
    organization_id: organizationId,
    property_id: finalPropertyId,
    guest_id: finalGuestId,
    created_by: existing?.created_by || DEFAULT_USER_ID,
    check_in: checkIn.toISOString().split('T')[0],
    check_out: checkOut.toISOString().split('T')[0],
    nights,
    guests_adults: guestsAdults,
    guests_children: guestsChildren,
    guests_infants: guestsInfants,
    guests_pets: guestsPets,
    guests_total: guestsTotal,
    pricing_price_per_night: pricePerNight,
    pricing_base_total: resolvedBaseTotal,
    pricing_cleaning_fee: cleaningFee,
    pricing_service_fee: serviceFee,
    pricing_taxes: taxes,
    pricing_discount: discount,
    pricing_total: total,
    pricing_currency: currency,
    status: derivedStatus,
    platform: derivePlatformFromStaysReservation(input, existing?.platform ?? null),
    external_id: externalId,
    external_url: externalUrl,
    payment_status: mapPaymentStatus(input?.paymentStatus, 'pending'),
    payment_method: input?.paymentMethod || null,
    notes: input?.notes || null,
    special_requests: input?.specialRequests || null,
    check_in_time: input?.checkInTime || null,
    check_out_time: input?.checkOutTime || null,
    cancelled_at: cancelledAtIso,
    cancellation_reason: cancellationReason,
    source_created_at: sourceCreatedAtIso,
    confirmed_at: derivedStatus === 'confirmed' ? new Date().toISOString() : null,

    // 🔒 Persistência completa do payload de origem (audit/debug)
    staysnet_raw: input,
  };
}

/**
 * POST /staysnet/webhooks/process/:organizationId
 * Processa webhooks pendentes e aplica alterações no SQL.
 */
export async function processStaysNetWebhooks(c: Context) {
  try {
    const { organizationId } = c.req.param();
    if (!organizationId) return c.json(errorResponse('organizationId is required'), 400);

    const limit = Math.max(1, Math.min(200, Number(c.req.query('limit') || 25)));
    const result = await processPendingStaysNetWebhooksForOrg(organizationId, limit);
    return c.json(successResponse(result));
  } catch (error) {
    logError('Error processing Stays.net webhooks', error);
    return c.json(errorResponse('Failed to process webhooks'), 500);
  }
}

/**
 * GET /staysnet/webhooks/diagnostics/:organizationId
 * Diagnóstico rápido: fila pendente, erros processados e últimos eventos.
 *
 * Útil para validar se o webhook está chegando e se o cron/processador está consumindo.
 */
export async function getStaysNetWebhooksDiagnostics(c: Context) {
  try {
    const { organizationId } = c.req.param();
    if (!organizationId) return c.json(errorResponse('organizationId is required'), 400);

    const limit = Math.max(1, Math.min(200, Number(c.req.query('limit') || 50)));
    const supabase = getSupabaseClient();

    const qPending = supabase
      .from('staysnet_webhooks')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('processed', false);

    const qErrorProcessed = supabase
      .from('staysnet_webhooks')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('processed', true)
      .not('error_message', 'is', null);

    const qRecent = supabase
      .from('staysnet_webhooks')
      .select('id, action, received_at, processed, processed_at, error_message, metadata, payload')
      .eq('organization_id', organizationId)
      .order('received_at', { ascending: false })
      .limit(limit);

    const [rPending, rErrProcessed, rRecent] = await Promise.all([qPending, qErrorProcessed, qRecent]);
    const firstError = rPending.error || rErrProcessed.error || rRecent.error;
    if (firstError) {
      return c.json(errorResponse('Failed to load Stays.net webhook diagnostics', { details: firstError.message }), 500);
    }

    const rows = (rRecent.data || []) as any[];

    const recent = rows.map((row) => {
      const reservationId = extractReservationIdFromPayload(row?.payload);
      const signature = row?.metadata?.headers?.['x-stays-signature'] || null;
      const signatureVerified = row?.metadata?.signature_verification?.verified ?? null;
      const signatureReason = row?.metadata?.signature_verification?.reason ?? null;
      return {
        id: row.id,
        action: row.action,
        reservationId,
        received_at: row.received_at,
        processed: row.processed,
        processed_at: row.processed_at || null,
        error_message: row.error_message || null,
        signature: signature ? String(signature).slice(0, 12) + '…' : null,
        signature_verified: signatureVerified,
        signature_reason: signatureReason,
      };
    });

    return c.json(
      successResponse({
        organizationId,
        counts: {
          pending: rPending.count ?? 0,
          processedWithError: rErrProcessed.count ?? 0,
          recentReturned: recent.length,
        },
        recent,
      }),
    );
  } catch (error: any) {
    logError('Error loading Stays.net webhook diagnostics', error);
    return c.json(errorResponse('Failed to load webhook diagnostics', { details: error?.message || String(error) }), 500);
  }
}

/**
 * POST /staysnet/backfill/guests/:organizationId
 * Backfill: cria/vincula guests para reservas que ainda estão com guest_id = null.
 *
 * Útil para corrigir histórico após ativar webhooks/rotinas antigas.
 */
export async function backfillStaysNetReservationGuests(c: Context) {
  try {
    const { organizationId } = c.req.param();
    if (!organizationId) return c.json(errorResponse('organizationId is required'), 400);

    const limit = Math.max(1, Math.min(500, Number(c.req.query('limit') || 200)));

    const supabase = getSupabaseClient();

    const { data: rows, error } = await supabase
      .from('reservations')
      .select('id, external_id, guest_id, staysnet_raw')
      .eq('organization_id', organizationId)
      .not('staysnet_raw', 'is', null)
      .limit(limit);

    if (error) return c.json(errorResponse('Failed to list reservations', { details: error.message }), 500);

    let scanned = 0;
    let updated = 0;
    let createdOrFound = 0;
    let skipped = 0;
    let errors = 0;

    for (const r of rows || []) {
      scanned++;
      try {
        const raw = (r as any).staysnet_raw;
        if (!raw) {
          skipped++;
          continue;
        }

        // Resolver property se possível
        const listingCandidate = extractListingCandidateFromStaysReservation(raw);
        let resolvedPropertyId: string | null = null;
        if (listingCandidate) {
          resolvedPropertyId = await resolveAnuncioDraftIdFromStaysId(supabase, organizationId, String(listingCandidate));
        }

        // Resolver/criar guest
        const existingGuestId = (r as any).guest_id || null;
        const resolvedGuestId = existingGuestId || (await resolveOrCreateGuestIdFromStaysReservation(supabase, organizationId, raw));
        if (resolvedGuestId) createdOrFound++;

        // Recalcular SQL completo com mapper (inclui pricing_*)
        const sqlData = mapStaysReservationToSql(raw, organizationId, resolvedPropertyId, resolvedGuestId, {
          id: (r as any).id,
          property_id: resolvedPropertyId,
          guest_id: existingGuestId,
          created_by: null,
        });

        // 🔒 Regra canônica: reservas sem imóvel não existem.
        // Se não conseguimos resolver property_id (nem existe vínculo anterior), não persistimos.
        if (!sqlData.property_id) {
          await supabase
            .from('reservations')
            .delete()
            .eq('organization_id', organizationId)
            .eq('id', (r as any).id);
          skipped++;
          continue;
        }

        const { error: upErr } = await supabase
          .from('reservations')
          .upsert(sqlData, { onConflict: 'organization_id,platform,external_id' });
        if (upErr) {
          errors++;
          continue;
        }

        updated++;
      } catch {
        errors++;
      }
    }

    return c.json(
      successResponse({
        scanned,
        createdOrFound,
        updated,
        skipped,
        errors,
      }),
    );
  } catch (error) {
    logError('Error backfilling Stays.net reservation guests', error);
    return c.json(errorResponse('Failed to backfill reservation guests'), 500);
  }
}

class StaysNetClient {
  private apiKey: string;
  private apiSecret?: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl: string, apiSecret?: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    // 🔧 Autenticação HTTP Basic Auth
    if (this.apiSecret) {
      const credentials = `${this.apiKey}:${this.apiSecret}`;
      const base64 = btoa(credentials);
      headers['Authorization'] = `Basic ${base64}`;
    } else {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    return headers;
  }

  async request(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any) {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const options: RequestInit = {
        method,
        headers: this.getHeaders(),
      };

      if (body && method === 'POST') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      const contentType = response.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      let data: any;
      if (isJson) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const errMsg = typeof data === 'string' ? data : JSON.stringify(data);
        return { success: false, error: `HTTP ${response.status}: ${errMsg}` };
      }

      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error?.message || String(error) };
    }
  }
}

/**
 * Processa webhooks pendentes e aplica alterações no SQL (helper reutilizável).
 *
 * Importante: NÃO depende de Context/Hono, para permitir uso em cron/worker.
 */
export async function processPendingStaysNetWebhooksForOrg(
  organizationId: string,
  limit: number = 25,
): Promise<{ processed: number; updated: number; skipped: number; errors: number }> {
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 25));
  const pending = await staysnetDB.listPendingWebhooksDB(organizationId, safeLimit);
  if (!pending.success) {
    throw new Error(pending.error || 'Failed to list webhooks');
  }

  const rows = pending.data || [];
  if (rows.length === 0) {
    return { processed: 0, updated: 0, skipped: 0, errors: 0 };
  }

  const staysConfig = await loadStaysNetRuntimeConfigOrThrow(organizationId);
  const client = new StaysNetClient(staysConfig.apiKey, staysConfig.baseUrl, staysConfig.apiSecret);
  const supabase = getSupabaseClient();

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const hook of rows) {
    processed++;
    try {
      const action = String(hook.action || '').trim();

      if (!action.startsWith('reservation.')) {
        skipped++;
        await staysnetDB.markWebhookProcessedDB(hook.id);
        continue;
      }

      // Pagamentos não impactam calendário; hoje não temos pipeline de conciliação financeira via webhook.
      // Para evitar ruído e falhas com IDs errados (paymentId vs reservationId), marcamos como processado.
      if (action.startsWith('reservation.payments.')) {
        skipped++;
        await staysnetDB.markWebhookProcessedDB(hook.id);
        continue;
      }

      const reservationId = extractReservationIdFromPayload(hook.payload);

      const cancellationCandidates = extractReservationIdCandidatesFromPayload(hook.payload);
      if (reservationId) cancellationCandidates.unshift(String(reservationId));

      // delete/canceled/cancelled: tratar como cancelamento (mesma regra), mas para bloqueios removemos.
      // Motivo: Stays pode enviar `reservation.deleted` quando a reserva é cancelada.
      if (isCancellationAction(action)) {
        const cancelResult = await applyCancellationForCandidates(supabase, organizationId, cancellationCandidates);
        if (cancelResult.matched > 0) {
          updated++;
          await staysnetDB.markWebhookProcessedDB(
            hook.id,
            `Cancellation applied (matched=${cancelResult.matched}, cancelled=${cancelResult.cancelled}, deletedBlocks=${cancelResult.deletedBlocks})`,
          );
          continue;
        }

        // Mesmo sem match em reservations, pode existir um block salvo corretamente.
        // Tentamos deletar via notes (idempotente) e, se houver datas/property no payload, restringimos.
        const payloadListingCandidate = extractListingCandidateFromStaysReservation(hook.payload);
        let payloadResolvedPropertyId: string | null = null;
        if (payloadListingCandidate) {
          payloadResolvedPropertyId = await resolveAnuncioDraftIdFromStaysId(supabase, organizationId, String(payloadListingCandidate));
        }
        const payloadDates = extractYmdRangeFromStaysLike(hook.payload);
        const deletedByNotes = await deleteBlocksByNotesCandidates({
          supabase,
          organizationId,
          candidates: cancellationCandidates,
          propertyId: payloadResolvedPropertyId,
          startDate: payloadDates.startDate,
          endDate: payloadDates.endDate,
        });
        if (deletedByNotes > 0) {
          const deletedMisclassified = await cleanupMisclassifiedBlockReservations(supabase, organizationId, cancellationCandidates);
          updated++;
          await staysnetDB.markWebhookProcessedDB(
            hook.id,
            `Cancellation webhook: deleted ${deletedByNotes} blocks (notes match) + cleaned ${deletedMisclassified} misclassified reservations`,
          );
          continue;
        }

        // Fallback: if payload itself already indicates a block-like reservation and we can resolve property/dates,
        // delete by (org, property, dates) but only for Stays-created blocks (reason contains 'Stays.net').
        const payloadTypeLower = String(unwrapStaysWebhookPayloadLike(hook.payload)?.type || '').trim().toLowerCase();
        if (isStaysBlockLikeType(payloadTypeLower) && payloadResolvedPropertyId && payloadDates.startDate && payloadDates.endDate) {
          const payloadSubtype = mapBlockSubtypeFromStaysType(payloadTypeLower);
          const deletedByFields = await deleteBlocksByPropertyDates({
            supabase,
            organizationId,
            propertyId: payloadResolvedPropertyId,
            startDate: payloadDates.startDate,
            endDate: payloadDates.endDate,
            subtype: payloadSubtype,
          });
          if (deletedByFields > 0) {
            const deletedMisclassified = await cleanupMisclassifiedBlockReservations(supabase, organizationId, cancellationCandidates);
            updated++;
            await staysnetDB.markWebhookProcessedDB(
              hook.id,
              `Cancellation webhook (payload block): deleted blocks=${deletedByFields} + cleaned ${deletedMisclassified} misclassified reservations`,
            );
            continue;
          }
        }

        // Se não encontramos no banco, tentamos buscar detalhes e criar/atualizar como cancelled.
        // Isso evita perder cancelamentos quando o evento chega antes da criação local.
        if (reservationId) {
          const detail = await client.request(`/booking/reservations/${reservationId}`, 'GET');
          if (detail.success) {
            const staysReservation = detail.data;

            const staysTypeLower = String((staysReservation as any)?.type || '').trim().toLowerCase();

            const listingCandidate =
              extractListingCandidateFromStaysReservation(staysReservation) ||
              extractListingCandidateFromStaysReservation(hook.payload);

            let resolvedPropertyId: string | null = null;
            if (listingCandidate) {
              resolvedPropertyId = await resolveAnuncioDraftIdFromStaysId(supabase, organizationId, String(listingCandidate));
            }

            // ✅ Se for bloqueio/manutenção, a ação de cancelamento significa remover o block (não marcar reserva).
            if (isStaysBlockLikeType(staysTypeLower)) {
              const startDate = toYmd((staysReservation as any)?.checkInDate || (staysReservation as any)?.checkIn);
              const endDate = toYmd((staysReservation as any)?.checkOutDate || (staysReservation as any)?.checkOut);
              const subtype = mapBlockSubtypeFromStaysType(staysTypeLower);
              const deletedMisclassified = await cleanupMisclassifiedBlockReservations(supabase, organizationId, cancellationCandidates);

              // Prefer deterministic deletion by notes/id. If we can also resolve property/dates, constrain even more.
              const deletedNotes = await deleteBlocksByNotesCandidates({
                supabase,
                organizationId,
                candidates: cancellationCandidates,
                propertyId: resolvedPropertyId,
                startDate,
                endDate,
              });

              let deletedByFields = 0;
              if (deletedNotes === 0 && resolvedPropertyId && startDate && endDate) {
                deletedByFields = await deleteBlocksByPropertyDates({
                  supabase,
                  organizationId,
                  propertyId: resolvedPropertyId,
                  startDate,
                  endDate,
                  subtype,
                });
              }

              if (deletedNotes + deletedByFields === 0) {
                skipped++;
                await staysnetDB.markWebhookProcessedDB(
                  hook.id,
                  'Cancellation webhook (block): no matching blocks found to delete',
                );
                continue;
              }

              updated++;
              await staysnetDB.markWebhookProcessedDB(
                hook.id,
                `Cancellation webhook (block): deleted blocks=${deletedNotes + deletedByFields} + cleaned ${deletedMisclassified} misclassified reservations`,
              );
              continue;
            }

            let resolvedGuestId: string | null = null;
            resolvedGuestId = await resolveOrCreateGuestIdFromStaysReservation(supabase, organizationId, staysReservation);

            const sqlData = mapStaysReservationToSql(staysReservation, organizationId, resolvedPropertyId, resolvedGuestId);
            (sqlData as any).status = 'cancelled';
            (sqlData as any).cancelled_at = (sqlData as any).cancelled_at || new Date().toISOString();

            if (!sqlData.property_id) {
              skipped++;
              await staysnetDB.markWebhookProcessedDB(
                hook.id,
                'Cancellation webhook: no match in DB and property not resolved (cannot persist cancelled reservation without property_id)',
              );
              continue;
            }

            const { error: upErr } = await supabase
              .from('reservations')
              .upsert(sqlData, { onConflict: 'organization_id,platform,external_id' });
            if (upErr) throw new Error(`Upsert failed (cancelled fallback): ${upErr.message}`);

            updated++;
            await staysnetDB.markWebhookProcessedDB(hook.id, 'Cancellation webhook: created/updated cancelled reservation');
            continue;
          }
        }

        skipped++;
        await staysnetDB.markWebhookProcessedDB(hook.id, 'Cancellation webhook: no matching reservation found');
        continue;
      }

      // ✅ ROBUSTEZ: Se o payload já é block-like (blocked/maintenance/etc), não depende de buscar
      // detalhes na API. Isso evita perder blocks quando o Stays deletou/recriou rápido e o ID
      // não existe mais no endpoint /booking/reservations/:id.
      const payloadLike = unwrapStaysWebhookPayloadLike(hook.payload);
      const payloadTypeLower = String(payloadLike?.type || '').trim().toLowerCase();
      if (isStaysBlockLikeType(payloadTypeLower)) {
        const listingCandidate = extractListingCandidateFromStaysReservation(hook.payload);
        let resolvedPropertyId: string | null = null;
        if (listingCandidate) {
          resolvedPropertyId = await resolveAnuncioDraftIdFromStaysId(supabase, organizationId, String(listingCandidate));
        }

        const payloadDates = extractYmdRangeFromStaysLike(hook.payload);
        const startDate = payloadDates.startDate;
        const endDate = payloadDates.endDate;

        if (!resolvedPropertyId || !startDate || !endDate) {
          skipped++;
          await staysnetDB.markWebhookProcessedDB(hook.id, 'Webhook (payload block): property/date not resolved; skipping');
          continue;
        }

        const subtype = mapBlockSubtypeFromStaysType(payloadTypeLower);
        const reason = buildBlockReasonFromStaysType(payloadTypeLower);

        const staysId = String((payloadLike as any)?._id || reservationId || '');
        const dedupeCandidates = Array.from(
          new Set(
            [...cancellationCandidates, staysId]
              .filter(Boolean)
              .map((x) => String(x)),
          ),
        );

        const upserted = await upsertBlockFromStaysReservation(
          supabase,
          organizationId,
          resolvedPropertyId,
          startDate,
          endDate,
          subtype,
          reason,
          {
            _id: staysId || null,
            type: payloadTypeLower,
            reservationId: reservationId || null,
            partner: (payloadLike as any)?.partner,
            partnerCode: (payloadLike as any)?.partnerCode,
            reservationUrl: (payloadLike as any)?.reservationUrl,
          },
        );

        const deletedMisclassified = await cleanupMisclassifiedBlockReservations(supabase, organizationId, dedupeCandidates);
        if (!upserted) {
          errors++;
          await staysnetDB.markWebhookProcessedDB(hook.id, 'Webhook (payload block): failed to upsert block');
          continue;
        }

        updated++;
        await staysnetDB.markWebhookProcessedDB(
          hook.id,
          `Webhook (payload block): upserted block (created=${upserted.created}) + cleaned ${deletedMisclassified} misclassified reservations`,
        );
        continue;
      }

      if (!reservationId) {
        throw new Error('Não foi possível extrair reservationId do webhook');
      }

      const detail = await client.request(`/booking/reservations/${reservationId}`, 'GET');
      if (!detail.success) {
        throw new Error(detail.error || 'Falha ao buscar detalhes da reserva');
      }

      const staysReservation = detail.data;

      const staysTypeLower = String((staysReservation as any)?.type || '').trim().toLowerCase();

      // Resolver property se possível
      const listingCandidate =
        extractListingCandidateFromStaysReservation(staysReservation) ||
        extractListingCandidateFromStaysReservation(hook.payload);

      // Dedupe: o mesmo booking pode aparecer com IDs diferentes ao longo do tempo
      // (ex.: confirmationCode vs _id). Para evitar duplicação e evitar violar o
      // unique (organization_id, platform, external_id), tentamos casar por múltiplos
      // campos, sempre filtrando pela organização.
      const preferredExternalId = (staysReservation?._id ?? reservationId) ? String(staysReservation?._id ?? reservationId) : null;
      const staysReservationCode = (staysReservation?.id ?? staysReservation?.reservationId ?? staysReservation?.confirmationCode)
        ? String(staysReservation?.id ?? staysReservation?.reservationId ?? staysReservation?.confirmationCode)
        : null;

      const dedupeCandidates = Array.from(
        new Set(
          [preferredExternalId, staysReservationCode, staysReservation?.confirmationCode, reservationId]
            .filter(Boolean)
            .map((x) => String(x))
        )
      );

      // ✅ Se for bloqueio/manutenção vindo da Stays, persistir em `blocks` (não em `reservations`).
      if (isStaysBlockLikeType(staysTypeLower)) {
        let resolvedPropertyId: string | null = null;
        if (listingCandidate) {
          resolvedPropertyId = await resolveAnuncioDraftIdFromStaysId(supabase, organizationId, String(listingCandidate));
        }

        const startDate = toYmd((staysReservation as any)?.checkInDate || (staysReservation as any)?.checkIn);
        const endDate = toYmd((staysReservation as any)?.checkOutDate || (staysReservation as any)?.checkOut);
        if (!resolvedPropertyId || !startDate || !endDate) {
          skipped++;
          await staysnetDB.markWebhookProcessedDB(hook.id, 'Webhook (block): property/date not resolved; skipping');
          continue;
        }

        const subtype = mapBlockSubtypeFromStaysType(staysTypeLower);
        const reason = buildBlockReasonFromStaysType(staysTypeLower);
        const upserted = await upsertBlockFromStaysReservation(
          supabase,
          organizationId,
          resolvedPropertyId,
          startDate,
          endDate,
          subtype,
          reason,
          {
            _id: (staysReservation as any)?._id ?? reservationId,
            type: staysTypeLower,
            reservationId,
            partner: (staysReservation as any)?.partner,
            partnerCode: (staysReservation as any)?.partnerCode,
            reservationUrl: (staysReservation as any)?.reservationUrl,
          },
        );

        const deletedMisclassified = await cleanupMisclassifiedBlockReservations(supabase, organizationId, dedupeCandidates);

        if (!upserted) {
          errors++;
          await staysnetDB.markWebhookProcessedDB(hook.id, 'Webhook (block): failed to upsert block');
          continue;
        }

        updated++;
        await staysnetDB.markWebhookProcessedDB(
          hook.id,
          `Webhook (block): upserted block (created=${upserted.created}) + cleaned ${deletedMisclassified} misclassified reservations`,
        );
        continue;
      }

      let existing: any = null;

      // 1) external_id
      if (!existing && dedupeCandidates.length > 0) {
        const ex = await supabase
          .from('reservations')
          .select('id, platform, property_id, guest_id, created_by, external_id')
          .eq('organization_id', organizationId)
          .in('external_id', dedupeCandidates)
          .order('updated_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!ex.error && ex.data) existing = ex.data;
      }

      // 2) id
      if (!existing && dedupeCandidates.length > 0) {
        const ex = await supabase
          .from('reservations')
          .select('id, platform, property_id, guest_id, created_by, external_id')
          .eq('organization_id', organizationId)
          .in('id', dedupeCandidates)
          .order('updated_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!ex.error && ex.data) existing = ex.data;
      }

      // 3) staysnet_reservation_code
      if (!existing && dedupeCandidates.length > 0) {
        const ex = await supabase
          .from('reservations')
          .select('id, platform, property_id, guest_id, created_by, external_id')
          .eq('organization_id', organizationId)
          .in('staysnet_reservation_code', dedupeCandidates)
          .order('updated_at', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!ex.error && ex.data) existing = ex.data;
      }

      // Se não vier externalId no payload, não apagamos o que já existe.
      if (!staysReservation?._id && existing?.external_id) {
        (staysReservation as any)._id = existing.external_id;
      }

      let resolvedPropertyId: string | null = null;
      if (listingCandidate) {
        resolvedPropertyId = await resolveAnuncioDraftIdFromStaysId(supabase, organizationId, String(listingCandidate));
      }

      // ✅ Resolver/criar guest automaticamente (se ainda não vinculado)
      let resolvedGuestId: string | null = existing?.guest_id || null;
      if (!resolvedGuestId) {
        resolvedGuestId = await resolveOrCreateGuestIdFromStaysReservation(supabase, organizationId, staysReservation);
      }

      const sqlData = mapStaysReservationToSql(staysReservation, organizationId, resolvedPropertyId, resolvedGuestId, existing);

      // 🔒 Regra canônica: reservas sem imóvel não existem.
      // Se não conseguimos resolver o imóvel e não há vínculo anterior, não persistimos.
      // Evita gerar cards “Propriedade não encontrada”.
      if (!sqlData.property_id) {
        if (existing?.id) {
          await supabase
            .from('reservations')
            .delete()
            .eq('organization_id', organizationId)
            .eq('id', existing.id);
        }

        skipped++;
        await staysnetDB.markWebhookProcessedDB(hook.id, 'Skipped: property not resolved (reservation without property is forbidden)');
        continue;
      }

      const { error: upErr } = await supabase
        .from('reservations')
        .upsert(sqlData, { onConflict: 'organization_id,platform,external_id' });

      if (upErr) throw new Error(`Upsert failed: ${upErr.message}`);

      updated++;
      await staysnetDB.markWebhookProcessedDB(hook.id);
    } catch (err: any) {
      errors++;
      await staysnetDB.markWebhookProcessedDB(hook.id, err?.message || 'Unknown error');
    }
  }

  return { processed, updated, skipped, errors };
}

