// Shared helper: resolve/create Guest from a Stays.net reservation payload
// Used by webhook processing and import flows.

type UnknownRecord = Record<string, unknown>;

type PostgrestErrorLike = { message?: string };
type PostgrestMaybeSingleResult = { data?: { id?: string } | null; error?: PostgrestErrorLike | null };

type PostgrestBuilderLike = {
  select: (...args: unknown[]) => PostgrestBuilderLike;
  eq: (...args: unknown[]) => PostgrestBuilderLike;
  maybeSingle: () => Promise<PostgrestMaybeSingleResult>;

  insert: (values: unknown) => PostgrestBuilderLike;
  single: () => Promise<PostgrestMaybeSingleResult>;
};

export type SupabaseClientLike = {
  from: (table: string) => PostgrestBuilderLike;
};

interface ExtractedGuest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  cpf?: string;
  passport?: string;
  birthDate?: string;
  nationality?: string;
  language?: string;
  source: string;
}

function hash32Hex(input: string): string {
  // djb2
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function asObject(value: unknown): UnknownRecord | null {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value as UnknownRecord;
  return null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : value === null || value === undefined ? '' : String(value);
}

function sanitizeDigits(input: string): string {
  return String(input || '').replace(/\D+/g, '');
}

function mapSource(source: string): string {
  if (!source) return 'other';
  const s = source.toLowerCase();
  if (s.includes('airbnb')) return 'airbnb';
  if (s.includes('booking')) return 'booking';
  if (s.includes('decolar')) return 'decolar';
  if (s.includes('direct')) return 'direct';
  if (s.includes('stays')) return 'other';
  return 'other';
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: '', lastName: '' };
}

function extractGuestDataFromStaysReservationPayload(reservationPayload: unknown): ExtractedGuest {
  const res = asObject(reservationPayload) || {};
  const guestObj = asObject(res['guest']) || {};

  const payloadEmail = asString(res['guestEmail'] || guestObj['email']).trim();

  let firstName = asString(res['guestFirstName'] || guestObj['firstName']).trim();
  let lastName = asString(res['guestLastName'] || guestObj['lastName']).trim();

  if (!firstName && !lastName) {
    const fullName = asString(res['guestName'] || guestObj['name']).trim();
    const split = splitName(fullName);
    firstName = split.firstName;
    lastName = split.lastName;
  }

  if (!firstName) {
    firstName = payloadEmail && payloadEmail.includes('@') ? payloadEmail.split('@')[0] : 'Hóspede';
  }

  const rawSource = asString(res['platform'] || res['source'] || res['partner'] || 'staysnet');
  const source = mapSource(rawSource);

  const cpf = asString(res['guestCpf'] || guestObj['cpf']).trim() || undefined;
  const passport = asString(res['guestPassport'] || guestObj['passport']).trim() || undefined;
  const phone = asString(res['guestPhone'] || guestObj['phone']).trim() || undefined;

  const email = (() => {
    if (payloadEmail && payloadEmail.includes('@')) return payloadEmail;

    const seed = [
      cpf ? `cpf:${sanitizeDigits(cpf)}` : null,
      passport ? `passport:${passport}` : null,
      phone ? `phone:${sanitizeDigits(phone)}` : null,
      `name:${firstName} ${lastName}`,
      `res:${asString(res['_id'] || res['id'] || res['confirmationCode'] || res['reservationId'] || '')}`,
    ]
      .filter(Boolean)
      .join('|');

    const h = hash32Hex(seed);
    return `noemail-${h}@staysnet.local`;
  })();

  return {
    firstName,
    lastName,
    email,
    phone,
    cpf,
    passport,
    birthDate: guestObj['birthDate'] ? asString(guestObj['birthDate']) : undefined,
    nationality: guestObj['nationality'] ? asString(guestObj['nationality']) : undefined,
    language: guestObj['language'] ? asString(guestObj['language']) : 'pt-BR',
    source,
  };
}

async function selectGuestIdByEmail(
  supabase: SupabaseClientLike,
  organizationId: string,
  email: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('guests')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.warn(`[staysnet-guest-link] Failed selecting guest by email: ${String(error.message || '')}`);
    return null;
  }

  return data?.id || null;
}

export async function resolveOrCreateGuestIdFromStaysReservation(
  supabase: SupabaseClientLike,
  organizationId: string,
  reservationPayload: unknown,
): Promise<string | null> {
  try {
    const guest = extractGuestDataFromStaysReservationPayload(reservationPayload);
    if (!guest.email) return null;

    const existingId = await selectGuestIdByEmail(supabase, organizationId, guest.email);
    if (existingId) return existingId;

    const birthDateIso = guest.birthDate ? new Date(guest.birthDate) : null;
    const birthDate = birthDateIso && !isNaN(birthDateIso.getTime())
      ? birthDateIso.toISOString().split('T')[0]
      : null;

    const insertRow = {
      organization_id: organizationId,
      first_name: guest.firstName,
      last_name: guest.lastName,
      email: guest.email,
      phone: guest.phone || null,
      cpf: guest.cpf || null,
      passport: guest.passport || null,
      birth_date: birthDate,
      nationality: guest.nationality || null,
      language: guest.language || 'pt-BR',
      source: guest.source || 'other',
      stats_total_reservations: 0,
      stats_total_nights: 0,
      stats_total_spent: 0,
      tags: ['staysnet'],
      is_blacklisted: false,
    };

    const { data: inserted, error: insertError } = await supabase
      .from('guests')
      .insert(insertRow)
      .select('id')
      .single();

    if (insertError) {
      // If there is a race/unique constraint, retry select.
      console.warn(`[staysnet-guest-link] Insert guest failed: ${String(insertError.message || '')}`);
      const retryId = await selectGuestIdByEmail(supabase, organizationId, guest.email);
      return retryId;
    }

    return inserted?.id || null;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[staysnet-guest-link] resolveOrCreateGuestIdFromStaysReservation failed: ${msg}`);
    return null;
  }
}
