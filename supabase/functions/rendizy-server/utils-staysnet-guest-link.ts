// Shared helper: resolve/create Guest from a Stays.net reservation payload
// Used by webhook processing and import flows.

type UnknownRecord = Record<string, unknown>;

type PostgrestErrorLike = { message?: string };
type PostgrestMaybeSingleResult = { data?: UnknownRecord | null; error?: PostgrestErrorLike | null };

type PostgrestBuilderLike = {
  select: (...args: unknown[]) => PostgrestBuilderLike;
  eq: (...args: unknown[]) => PostgrestBuilderLike;
  maybeSingle: () => Promise<PostgrestMaybeSingleResult>;

  update: (values: unknown) => PostgrestBuilderLike;
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
  staysnetClientId?: string;
  staysnetRaw?: unknown;
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

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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

  const guestsDetailsObj = asObject(res['guestsDetails'] ?? res['guests_details']) || {};
  const guestsList = asArray(guestsDetailsObj['list']);
  const primaryFromList = (() => {
    const candidates = guestsList
      .map((x) => asObject(x))
      .filter(Boolean) as UnknownRecord[];
    if (candidates.length === 0) return null;
    const primary = candidates.find((c) => c['primary'] === true);
    return primary || candidates[0];
  })();

  const primaryNameFromList = primaryFromList ? asString(primaryFromList['name']).trim() : '';
  const primaryPhonesFromList = primaryFromList ? asArray(primaryFromList['phones']) : [];
  const primaryPhoneIsoFromList = (() => {
    const p0 = asObject(primaryPhonesFromList[0]);
    const iso = p0 ? asString(p0['iso']).trim() : '';
    return iso;
  })();

  const staysnetClientId = asString(res['_idclient']).trim() || undefined;

  const payloadEmail = asString(
    res['guestEmail'] ??
      res['email'] ??
      res['clientEmail'] ??
      res['customerEmail'] ??
      res['contactEmail'] ??
      guestObj['email'] ??
      guestObj['mail'] ??
      guestObj['emailAddress'] ??
      guestObj['contactEmail'],
  ).trim();

  let firstName = asString(res['guestFirstName'] ?? guestObj['firstName'] ?? guestObj['first_name']).trim();
  let lastName = asString(res['guestLastName'] ?? guestObj['lastName'] ?? guestObj['last_name']).trim();

  if (!firstName && !lastName) {
    const fullName = asString(res['guestName'] ?? guestObj['name'] ?? guestObj['fullName'] ?? guestObj['full_name']).trim();
    const split = splitName(fullName || primaryNameFromList);
    firstName = split.firstName;
    lastName = split.lastName;
  }

  if (!firstName) {
    firstName = payloadEmail && payloadEmail.includes('@') ? payloadEmail.split('@')[0] : 'Hóspede';
  }

  const partnerObj = asObject(res['partner']);
  const rawSource = asString(
    res['platform'] ??
      res['source'] ??
      (partnerObj ? partnerObj['name'] ?? partnerObj['code'] : res['partner']) ??
      'staysnet',
  );
  const source = mapSource(rawSource);

  const cpf = asString(res['guestCpf'] ?? guestObj['cpf']).trim() || undefined;
  const passport = asString(res['guestPassport'] ?? guestObj['passport']).trim() || undefined;
  const phone = asString(
    res['guestPhone'] ??
      res['phone'] ??
      res['clientPhone'] ??
      res['customerPhone'] ??
      res['contactPhone'] ??
      guestObj['phone'] ??
      guestObj['phoneNumber'] ??
      guestObj['phone_number'] ??
      guestObj['mobile'] ??
      guestObj['cellphone'] ??
        guestObj['telephone'],
  ).trim() || undefined;

  const phoneFinal = phone || (primaryPhoneIsoFromList ? primaryPhoneIsoFromList : undefined);

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
    phone: phoneFinal,
    cpf,
    passport,
    birthDate: guestObj['birthDate'] ? asString(guestObj['birthDate']) : undefined,
    nationality: guestObj['nationality'] ? asString(guestObj['nationality']) : undefined,
    language: guestObj['language'] ? asString(guestObj['language']) : 'pt-BR',
    source,
    staysnetClientId,
    staysnetRaw: {
      _idclient: staysnetClientId || null,
      guest: guestObj,
      guestEmail: payloadEmail || null,
      guestName: asString(res['guestName'] || guestObj['name'] || guestObj['fullName'] || guestObj['full_name']).trim() || null,
      platform: asString(res['platform']).trim() || null,
      source: asString(res['source']).trim() || null,
      partner: res['partner'],
      guestsDetailsPrimaryFromList: primaryFromList ? {
        name: primaryNameFromList || null,
        phoneIso: primaryPhoneIsoFromList || null,
      } : null,
    },
  };
}

async function selectGuestIdByStaysnetClientId(
  supabase: SupabaseClientLike,
  organizationId: string,
  staysnetClientId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('guests')
    .select('id, phone, first_name, last_name, staysnet_client_id')
    .eq('organization_id', organizationId)
    .eq('staysnet_client_id', staysnetClientId)
    .maybeSingle();

  if (error) {
    const msg = String(error.message || '');
    if (/staysnet_client_id/i.test(msg) && /does not exist/i.test(msg)) {
      // compat: coluna ainda não existe
      return null;
    }
    console.warn(`[staysnet-guest-link] Failed selecting guest by staysnet_client_id: ${msg}`);
    return null;
  }

  return asObject(data)?.id ? asString(asObject(data)?.id) : null;
}

async function selectGuestIdByEmail(
  supabase: SupabaseClientLike,
  organizationId: string,
  email: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('guests')
    .select('id, phone, first_name, last_name, staysnet_client_id')
    .eq('organization_id', organizationId)
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.warn(`[staysnet-guest-link] Failed selecting guest by email: ${String(error.message || '')}`);
    return null;
  }

  return asObject(data)?.id ? asString(asObject(data)?.id) : null;
}

async function maybeEnrichExistingGuest(
  supabase: SupabaseClientLike,
  organizationId: string,
  existingRow: UnknownRecord,
  extracted: ExtractedGuest,
): Promise<void> {
  const existingId = asString(existingRow['id']).trim();
  if (!existingId) return;

  const update: Record<string, unknown> = {};
  const currentPhone = asString(existingRow['phone']).trim();
  const currentFirst = asString(existingRow['first_name']).trim();
  const currentLast = asString(existingRow['last_name']).trim();
  const currentClientId = asString(existingRow['staysnet_client_id']).trim();

  if (!currentPhone && extracted.phone) update.phone = extracted.phone;
  if (!currentFirst && extracted.firstName) update.first_name = extracted.firstName;
  if (!currentLast && extracted.lastName) update.last_name = extracted.lastName;
  if (!currentClientId && extracted.staysnetClientId) update.staysnet_client_id = extracted.staysnetClientId;

  if (Object.keys(update).length === 0) return;

  try {
    const { error } = await supabase
      .from('guests')
      .update(update)
      .eq('organization_id', organizationId)
      .eq('id', existingId)
      .maybeSingle();

    if (error) {
      const msg = String(error.message || '');
      // compat: coluna ainda não existe
      if (/does not exist/i.test(msg) && /staysnet_client_id/i.test(msg)) {
        const compatUpdate: Record<string, unknown> = { ...update };
        delete compatUpdate.staysnet_client_id;
        if (Object.keys(compatUpdate).length === 0) return;
        await supabase
          .from('guests')
          .update(compatUpdate)
          .eq('organization_id', organizationId)
          .eq('id', existingId)
          .maybeSingle();
        return;
      }
      console.warn(`[staysnet-guest-link] Failed enriching existing guest: ${msg}`);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[staysnet-guest-link] Failed enriching existing guest (exception): ${msg}`);
  }
}

export async function resolveOrCreateGuestIdFromStaysReservation(
  supabase: SupabaseClientLike,
  organizationId: string,
  reservationPayload: unknown,
): Promise<string | null> {
  try {
    const guest = extractGuestDataFromStaysReservationPayload(reservationPayload);
    if (!guest.email) return null;

    if (guest.staysnetClientId) {
      const { data: existingRow } = await supabase
        .from('guests')
        .select('id, phone, first_name, last_name, staysnet_client_id')
        .eq('organization_id', organizationId)
        .eq('staysnet_client_id', guest.staysnetClientId)
        .maybeSingle();

      const existingObj = asObject(existingRow);
      if (existingObj?.id) {
        await maybeEnrichExistingGuest(supabase, organizationId, existingObj, guest);
        return asString(existingObj.id);
      }
    }

    const { data: existingByEmail } = await supabase
      .from('guests')
      .select('id, phone, first_name, last_name, staysnet_client_id')
      .eq('organization_id', organizationId)
      .eq('email', guest.email)
      .maybeSingle();

    const existingEmailObj = asObject(existingByEmail);
    if (existingEmailObj?.id) {
      await maybeEnrichExistingGuest(supabase, organizationId, existingEmailObj, guest);
      return asString(existingEmailObj.id);
    }

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
      staysnet_client_id: guest.staysnetClientId || null,
      staysnet_raw: guest.staysnetRaw || null,
      stats_total_reservations: 0,
      stats_total_nights: 0,
      stats_total_spent: 0,
      tags: ['staysnet'],
      is_blacklisted: false,
    };

    let { data: inserted, error: insertError } = await supabase
      .from('guests')
      .insert(insertRow)
      .select('id')
      .single();

    if (insertError && /does not exist/i.test(String(insertError.message || ''))) {
      const msg = String(insertError.message || '');
      const shouldDropClientId = /staysnet_client_id/i.test(msg);
      const shouldDropRaw = /staysnet_raw/i.test(msg);
      if (shouldDropClientId || shouldDropRaw) {
        const compat: Record<string, unknown> = { ...(insertRow as Record<string, unknown>) };
        if (shouldDropClientId) delete compat.staysnet_client_id;
        if (shouldDropRaw) delete compat.staysnet_raw;
        const retry = await supabase
          .from('guests')
          .insert(compat)
          .select('id')
          .single();
        inserted = retry.data as { id?: string } | null;
        insertError = retry.error as PostgrestErrorLike | null;
      }
    }

    if (insertError) {
      // If there is a race/unique constraint, retry select.
      console.warn(`[staysnet-guest-link] Insert guest failed: ${String(insertError.message || '')}`);
      if (guest.staysnetClientId) {
        const retryByClientId = await selectGuestIdByStaysnetClientId(supabase, organizationId, guest.staysnetClientId);
        if (retryByClientId) return retryByClientId;
      }
      const retryId = await selectGuestIdByEmail(supabase, organizationId, guest.email);
      return retryId;
    }

    return inserted && (inserted as UnknownRecord).id ? asString((inserted as UnknownRecord).id) : null;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[staysnet-guest-link] resolveOrCreateGuestIdFromStaysReservation failed: ${msg}`);
    return null;
  }
}
