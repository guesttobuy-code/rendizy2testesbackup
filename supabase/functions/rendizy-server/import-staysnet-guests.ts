/**
 * ⚡ IMPORT STAYSNET - GUESTS (HÓSPEDES) - v1.0.104
 * 
 * PADRÃO ATÔMICO:
 * - Extrai dados de guests das reservations
 * - Inserts diretos na tabela guests
 * - Deduplica via email + organization_id
 * - Atualiza reservation.guest_id para vincular
 * 
 * DEPENDÊNCIA: Deve ser executado APÓS import-staysnet-reservations.ts
 * 
 * ENDPOINT API: GET /booking/reservations (extrai guests daqui)
 * TABELA DESTINO: guests
 * 
 * REFERÊNCIA: docs/architecture/PERSISTENCIA_ATOMICA_PADRAO_VITORIOSO.md
 */

import { Context } from 'npm:hono';
import { getSupabaseClient } from './kv_store.tsx';
import { loadStaysNetRuntimeConfigOrThrow } from './utils-staysnet-config.ts';
import { getOrganizationIdOrThrow } from './utils-get-organization-id.ts';

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';

// ============================================================================
// TIPOS - Guest extraído de StaysNet Reservation
// ============================================================================
interface StaysNetReservation {
  _id: string;
  confirmationCode?: string;

  // Alguns payloads vêm apenas com o id do cliente no Stays.
  _idclient?: string;
  
  // Dados do hóspede (pode vir em diferentes formatos)
  guestName?: string;
  guestFirstName?: string;
  guestLastName?: string;
  guestEmail?: string;
  guestPhone?: string;
  guestCpf?: string;
  guestPassport?: string;
  
  guest?: {
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    cpf?: string;
    passport?: string;
    birthDate?: string;
    nationality?: string;
    language?: string;
  };
  
  platform?: string;
  source?: string;
  
  [key: string]: any;
}

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

// ============================================================================
// FUNÇÃO AUXILIAR: Extrair dados do guest de diferentes estruturas
// ============================================================================
function hash32Hex(input: string): string {
  // djb2
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  // unsigned 32-bit
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function sanitizeDigits(input: string): string {
  return String(input || '').replace(/\D+/g, '');
}

function extractGuestData(res: StaysNetReservation): ExtractedGuest {
  const payloadEmail = (res.guestEmail || res.guest?.email || '').trim();

  // Nome pode vir em diferentes formatos
  let firstName = res.guestFirstName || res.guest?.firstName || '';
  let lastName = res.guestLastName || res.guest?.lastName || '';
  
  // Se não tem first/last, tenta separar do guestName
  if (!firstName && !lastName) {
    const fullName = res.guestName || res.guest?.name || '';
    const parts = fullName.trim().split(/\s+/);
    
    if (parts.length >= 2) {
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    } else if (parts.length === 1) {
      firstName = parts[0];
      lastName = '';
    }
  }

  // Se ainda não tem nome, usa email como fallback
  if (!firstName) {
    firstName = payloadEmail ? payloadEmail.split('@')[0] : 'Hóspede';
  }

  // Determinar source/platform
  const source = res.platform || res.source || 'staysnet';
  const mappedSource = mapSource(source);

  const cpf = (res.guestCpf || res.guest?.cpf || undefined)?.trim();
  const passport = (res.guestPassport || res.guest?.passport || undefined)?.trim();
  const phoneRaw = (res.guestPhone || res.guest?.phone || undefined)?.trim();

  // Se não tiver email real, gerar um email sintético estável para:
  // - permitir insert sem quebrar frontend (guest.email é string)
  // - permitir dedupe com base em cpf/passport/phone/nome
  const email = (() => {
    if (payloadEmail && payloadEmail.includes('@')) return payloadEmail;

    const dedupeSeed = [
      res._idclient ? `client:${res._idclient}` : null,
      cpf ? `cpf:${sanitizeDigits(cpf)}` : null,
      passport ? `passport:${passport}` : null,
      phoneRaw ? `phone:${sanitizeDigits(phoneRaw)}` : null,
      `name:${firstName} ${lastName}`,
      // Fallback final para evitar seed vazio
      `res:${res._id || res.confirmationCode || ''}`,
    ]
      .filter(Boolean)
      .join('|');

    const h = hash32Hex(dedupeSeed);
    return `noemail-${h}@staysnet.local`;
  })();

  // Banco exige phone NOT NULL. Se não vier, gerar um telefone sintético estável.
  const phone = (() => {
    if (phoneRaw) return phoneRaw;
    const seed = [res._idclient ? `client:${res._idclient}` : null, `email:${email}`].filter(Boolean).join('|');
    const h = hash32Hex(seed);
    const n = parseInt(h.slice(0, 8), 16) % 100000000; // 8 dígitos
    return `119${String(n).padStart(8, '0')}`; // 11 dígitos (BR)
  })();

  return {
    firstName: firstName,
    lastName: lastName,
    email: email,
    phone,
    cpf,
    passport,
    birthDate: res.guest?.birthDate || undefined,
    nationality: res.guest?.nationality || undefined,
    language: res.guest?.language || 'pt-BR',
    source: mappedSource
  };
}

// ============================================================================
// FUNÇÃO AUXILIAR: Mapear source
// ============================================================================
function mapSource(source: string): string {
  if (!source) return 'other';
  
  const sourceStr = source.toLowerCase();
  
  if (sourceStr.includes('airbnb')) return 'airbnb';
  if (sourceStr.includes('booking')) return 'booking';
  if (sourceStr.includes('decolar')) return 'decolar';
  if (sourceStr.includes('direct')) return 'direct';
  
  return 'other';
}

// ============================================================================
// FUNÇÃO PRINCIPAL DE IMPORTAÇÃO
// ============================================================================
export async function importStaysNetGuests(c: Context) {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('⚡ IMPORT STAYSNET - GUESTS (HÓSPEDES)');
  console.log('═══════════════════════════════════════════════════');
  console.log('📍 API Endpoint: /booking/reservations (extrai guests)');
  console.log('📍 Tabela Destino: guests');
  console.log('📍 Método: INSERT direto + UPDATE reservation.guest_id');
  console.log('═══════════════════════════════════════════════════\n');

  let fetched = 0;
  let processed = 0;
  let created = 0;
  let linked = 0;
  let skipped = 0;
  let errors = 0;
  const errorDetails: Array<{guest: string, error: string}> = [];

  try {
    const supabase = getSupabaseClient();

    // ✅ Multi-tenant: pegar organization_id correto (fallback seguro)
    let orgId = DEFAULT_ORG_ID;
    try {
      orgId = await getOrganizationIdOrThrow(c);
    } catch {
      orgId = DEFAULT_ORG_ID;
    }

    // ========================================================================
    // STEP 1: BUSCAR RESERVATIONS DA API STAYSNET (para extrair guests)
    // ========================================================================
    console.log('📡 [FETCH] Buscando reservations de /booking/reservations...');
    
    // ✅ CORREÇÃO: API exige from, to, dateType (não startDate/endDate)
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 12); // 12 meses atrás
    const toDate = new Date();
    toDate.setMonth(toDate.getMonth() + 12); // +12 meses no futuro
    
    const from = fromDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const to = toDate.toISOString().split('T')[0];     // YYYY-MM-DD
    
    // Permitir override via body/query
    const body = await c.req.json().catch(() => null as any);
    const bodyFrom = body?.from || body?.startDate;
    const bodyTo = body?.to || body?.endDate;
    const fromFinal = String((c.req.query('from') || bodyFrom || from) ?? '').trim();
    const toFinal = String((c.req.query('to') || bodyTo || to) ?? '').trim();
    const dateType = String((c.req.query('dateType') || body?.dateType || 'included') ?? '').trim();
    // A API da StaysNet tende a falhar com `limit` muito alto.
    // Permitimos um aumento moderado (até 50) para reduzir batches, e o controle de volume
    // continua via `maxPages` + timeouts do caller.
    const limit = Math.min(50, Math.max(1, Number(c.req.query('limit') || body?.limit || 20)));
    // ✅ Segurança anti-timeout: default de poucas páginas. O caller pode continuar via `next.skip`.
    const maxPages = Math.max(1, Number(c.req.query('maxPages') || body?.maxPages || 5));
    let skip = Math.max(0, Number(c.req.query('skip') || body?.skip || 0));
    const startSkip = skip;
    let hasMore = false;

    console.log(`   🧾 organization_id: ${orgId}`);
    console.log(`   📅 Período: ${fromFinal} até ${toFinal}`);
    console.log(`   📌 dateType: ${dateType}`);
    console.log(`   📄 Paginação: limit=${limit}, maxPages=${maxPages}, skip=${skip}`);
    
    // ✅ Basic Auth (não x-api-key)
    const staysConfig = await loadStaysNetRuntimeConfigOrThrow(orgId);
    const credentials = btoa(`${staysConfig.apiKey}:${staysConfig.apiSecret}`);
    
    const allReservations: StaysNetReservation[] = [];
    let pages = 0;

    while (pages < maxPages) {
      const params = new URLSearchParams({
        from: fromFinal,
        to: toFinal,
        dateType,
        limit: String(limit),
        skip: String(skip),
      });

      const response = await fetch(`${staysConfig.baseUrl}/booking/reservations?${params}`, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`StaysNet API falhou: ${response.status} - ${errorText.substring(0, 200)}`);
      }

      const pageData: StaysNetReservation[] = await response.json();
      if (!Array.isArray(pageData)) {
        throw new Error(`Resposta da API não é um array. Tipo: ${typeof pageData}`);
      }

      allReservations.push(...pageData);
      console.log(`   📥 Página ${pages + 1}: ${pageData.length} itens (total=${allReservations.length})`);

      if (pageData.length < limit) {
        hasMore = false;
        break;
      }

      skip += limit;
      pages++;
      hasMore = pages < maxPages;
    }

    if (pages >= maxPages) {
      hasMore = true;
      console.warn(`   ⚠️ Paginação atingiu maxPages=${maxPages}. Retornando parcial (use next.skip para continuar).`);
    }

    const reservations: StaysNetReservation[] = allReservations;

    fetched = reservations.length;
    console.log(`✅ [FETCH] ${fetched} reservations recebidas\n`);

    if (fetched === 0) {
      return c.json({
        success: true,
        method: 'import-guests',
        stats: { fetched: 0, processed: 0, created: 0, linked: 0, skipped: 0, errors: 0 },
        next: { skip: startSkip, hasMore: false },
        message: 'Nenhuma reservation encontrada na API StaysNet'
      });
    }

    // ========================================================================
    // STEP 2: PROCESSAR CADA RESERVATION E EXTRAIR GUEST
    // ========================================================================
    for (let i = 0; i < reservations.length; i++) {
      const res = reservations[i];
      const confirmationCode = res.confirmationCode || res._id || `RES-${i + 1}`;

      console.log(`\n[${i + 1}/${fetched}] 👤 Processando guest de: ${confirmationCode}`);
      processed++;

      try {
        // ====================================================================
        // 2.1: EXTRAIR DADOS DO GUEST
        // ====================================================================
        const guestData = extractGuestData(res);
        console.log(`   📧 Email: ${guestData.email}${guestData.email.endsWith('@staysnet.local') ? ' (sintético)' : ''}`);

        // ====================================================================
        // 2.2: BUSCAR RESERVATION NO BANCO (para vincular depois)
        // ====================================================================
        const externalId = res._id || res.confirmationCode;
        
        const { data: reservation, error: resError } = await supabase
          .from('reservations')
          .select('id, guest_id')
          .eq('organization_id', orgId)
          .eq('external_id', externalId)
          .maybeSingle();

        if (resError) {
          console.error(`   ❌ Erro ao buscar reservation:`, resError.message);
          skipped++;
          continue;
        }

        if (!reservation) {
          console.warn(`   ⚠️ Reservation não encontrada no banco - SKIP (rode import-reservations primeiro)`);
          skipped++;
          continue;
        }

        // ====================================================================
        // 2.3: VERIFICAR SE GUEST JÁ EXISTE (deduplicação via email)
        // ====================================================================
        const { data: existingGuest, error: checkError } = await supabase
          .from('guests')
          .select('id')
          .eq('organization_id', orgId)
          .eq('email', guestData.email)
          .maybeSingle();

        if (checkError) {
          console.error(`   ❌ Erro ao verificar guest:`, checkError.message);
        }

        let guestId: string;

        if (existingGuest) {
          guestId = existingGuest.id;
          console.log(`   ♻️ Guest já existe: ${guestId}`);
        } else {
          // ================================================================
          // 2.4: CRIAR NOVO GUEST
          // ================================================================
          console.log(`   ➕ Criando novo guest...`);
          
          const newGuestData = {
            id: crypto.randomUUID(),
            organization_id: orgId,
            first_name: guestData.firstName,
            last_name: guestData.lastName,
            email: guestData.email,
            phone: guestData.phone || null,
            cpf: guestData.cpf || null,
            passport: guestData.passport || null,
            birth_date: guestData.birthDate ? new Date(guestData.birthDate).toISOString().split('T')[0] : null,
            nationality: guestData.nationality || null,
            language: guestData.language || 'pt-BR',
            source: guestData.source,
            stats_total_reservations: 0,
            stats_total_nights: 0,
            stats_total_spent: 0,
            tags: ['staysnet'],
            is_blacklisted: false
          };

          const { data: insertedGuest, error: insertError } = await supabase
            .from('guests')
            .insert(newGuestData)
            .select('id')
            .single();

          if (insertError) {
            throw new Error(`Falha ao criar guest: ${insertError.message}`);
          }

          guestId = insertedGuest.id;
          console.log(`   ✅ Guest criado: ${guestId}`);
          created++;
        }

        // ====================================================================
        // 2.5: VINCULAR GUEST À RESERVATION (se ainda não estiver vinculado)
        // ====================================================================
        if (reservation.guest_id !== guestId) {
          const { error: linkError } = await supabase
            .from('reservations')
            .update({ guest_id: guestId })
            .eq('id', reservation.id)
            .eq('organization_id', orgId);

          if (linkError) {
            console.error(`   ❌ Erro ao vincular guest à reservation:`, linkError.message);
          } else {
            console.log(`   🔗 Guest vinculado à reservation: ${reservation.id}`);
            linked++;
          }
        } else {
          console.log(`   ✓ Guest já estava vinculado`);
        }

      } catch (err: any) {
        console.error(`   ❌ Erro ao processar ${confirmationCode}:`, err.message);
        errors++;
        errorDetails.push({
          guest: confirmationCode,
          error: err.message
        });
      }
    }

    // ========================================================================
    // STEP 3: RESULTADO FINAL
    // ========================================================================
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📊 RESULTADO FINAL - IMPORT GUESTS');
    console.log('═══════════════════════════════════════════════════');
    console.log(`   Fetched:    ${fetched}`);
    console.log(`   Processed:  ${processed}`);
    console.log(`   Created:    ${created}`);
    console.log(`   Linked:     ${linked}`);
    console.log(`   Skipped:    ${skipped}`);
    console.log(`   Errors:     ${errors}`);
    console.log('═══════════════════════════════════════════════════\n');

    if (errors > 0) {
      console.error('❌ ERROS DETALHADOS:');
      errorDetails.forEach((err, idx) => {
        console.error(`   ${idx + 1}. ${err.guest}: ${err.error}`);
      });
    }

    return c.json({
      success: errors < processed,
      method: 'import-guests',
      table: 'guests',
      stats: { fetched, processed, created, linked, skipped, errors },
      next: { skip, hasMore },
      errorDetails: errors > 0 ? errorDetails : undefined,
      message: `Importados ${created} guests de StaysNet, ${linked} vinculados a reservations (skipped: ${skipped})`
    });

  } catch (error: any) {
    console.error('\n❌❌❌ ERRO GERAL NO IMPORT ❌❌❌');
    console.error('Erro:', error.message);
    console.error('Stack:', error.stack);
    
    return c.json({
      success: false,
      method: 'import-guests',
      error: error.message,
      stats: { fetched, processed, created, linked, skipped, errors },
      next: { skip, hasMore: false }
    }, 500);
  }
}
