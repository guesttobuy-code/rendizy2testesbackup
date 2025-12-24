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

const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000000';

// ============================================================================
// TIPOS - Guest extraído de StaysNet Reservation
// ============================================================================
interface StaysNetReservation {
  _id: string;
  confirmationCode?: string;
  
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
function extractGuestData(res: StaysNetReservation): ExtractedGuest | null {
  // Email é obrigatório para deduplica e identificação
  const email = res.guestEmail || res.guest?.email;
  
  if (!email || !email.includes('@')) {
    return null; // Sem email válido, não pode criar guest
  }

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
    firstName = email.split('@')[0];
  }

  // Determinar source/platform
  const source = res.platform || res.source || 'staysnet';
  const mappedSource = mapSource(source);

  return {
    firstName: firstName,
    lastName: lastName,
    email: email,
    phone: res.guestPhone || res.guest?.phone || undefined,
    cpf: res.guestCpf || res.guest?.cpf || undefined,
    passport: res.guestPassport || res.guest?.passport || undefined,
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
    
    console.log(`   📅 Período: ${from} até ${to}`);
    console.log(`   📌 dateType: creation`);
    
    // ✅ Basic Auth (não x-api-key)
    const staysConfig = await loadStaysNetRuntimeConfigOrThrow(orgId);
    const credentials = btoa(`${staysConfig.apiKey}:${staysConfig.apiSecret}`);
    
    const params = new URLSearchParams({
      from: from,
      to: to,
      dateType: 'creation',
      limit: '100'
    });
    
    const response = await fetch(
      `${staysConfig.baseUrl}/booking/reservations?${params}`,
      {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`StaysNet API falhou: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const reservations: StaysNetReservation[] = await response.json();
    
    if (!Array.isArray(reservations)) {
      throw new Error(`Resposta da API não é um array. Tipo: ${typeof reservations}`);
    }

    fetched = reservations.length;
    console.log(`✅ [FETCH] ${fetched} reservations recebidas\n`);

    if (fetched === 0) {
      return c.json({
        success: true,
        method: 'import-guests',
        stats: { fetched: 0, processed: 0, created: 0, linked: 0, skipped: 0, errors: 0 },
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
        
        if (!guestData) {
          console.warn(`   ⚠️ Sem email válido - SKIP`);
          skipped++;
          continue;
        }

        console.log(`   📧 Email: ${guestData.email}`);

        // ====================================================================
        // 2.2: BUSCAR RESERVATION NO BANCO (para vincular depois)
        // ====================================================================
        const externalId = res._id || res.confirmationCode;
        
        const { data: reservation, error: resError } = await supabase
          .from('reservations')
          .select('id, guest_id')
          .eq('organization_id', DEFAULT_ORG_ID)
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
          .eq('organization_id', DEFAULT_ORG_ID)
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
            organization_id: DEFAULT_ORG_ID,
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
            .eq('id', reservation.id);

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
      stats: { fetched, processed, created, linked, skipped, errors }
    }, 500);
  }
}
