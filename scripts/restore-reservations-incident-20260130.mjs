/**
 * Script de Restauração de Reservas - Incidente 2026-01-30
 * 
 * PROBLEMA: A reconciliação de 29/01 às 23:58 cancelou 286 reservas
 *           incorretamente, marcando-as como "deletadas na Stays.net"
 *           quando na verdade elas ainda existem na API.
 *
 * EXECUÇÃO:
 *   node scripts/restore-reservations-incident-20260130.mjs
 */

const SUPABASE_URL = "https://odcgnzfremrqnvtitpcc.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjM1NDE3MSwiZXhwIjoyMDc3OTMwMTcxfQ.VHFenB49fLdgSUH-j9DUKgNgrWbcNjhCodhMtEa-rfE";

const STAYS_API_KEY = "a5146970";
const STAYS_API_SECRET = "bfcf4daf";
const STAYS_BASE_URL = "https://bvm.stays.net/external/v1";

const headers = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  "Content-Type": "application/json",
};

const staysAuth = Buffer.from(`${STAYS_API_KEY}:${STAYS_API_SECRET}`).toString("base64");

// Mapear status do Stays para Rendizy
function mapStaysStatus(staysType) {
  const map = {
    booked: "confirmed",
    confirmed: "confirmed",
    new: "confirmed",
    pending: "pending",
    inquiry: "pending",
    cancelled: "cancelled",
    canceled: "cancelled",
    checked_in: "checked_in",
    checked_out: "checked_out",
  };
  return map[staysType?.toLowerCase()] || "pending";
}

// Verificar se reserva existe na Stays.net
async function checkStaysReservation(externalId) {
  try {
    const url = `${STAYS_BASE_URL}/booking/reservations/${externalId}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${staysAuth}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 404) {
      return { exists: false };
    }

    if (response.status === 401 || response.status === 403) {
      return { exists: false, error: `Auth error: ${response.status}` };
    }

    if (!response.ok) {
      return { exists: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return {
      exists: true,
      type: data.type,
      checkIn: data.checkInDate || data.checkIn,
      checkOut: data.checkOutDate || data.checkOut,
    };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

// Restaurar uma reserva
async function restoreReservation(id, newStatus) {
  const url = `${SUPABASE_URL}/rest/v1/reservations?id=eq.${id}`;
  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      ...headers,
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      status: newStatus,
      cancelled_at: null,
      cancellation_reason: null,
      updated_at: new Date().toISOString(),
    }),
  });

  return response.ok;
}

// Buscar reservas canceladas pela reconciliação
async function fetchCancelledReservations() {
  const url = `${SUPABASE_URL}/rest/v1/reservations?cancellation_reason=ilike.*reconcilia*&select=id,external_id,staysnet_reservation_code,check_in,check_out,status,cancelled_at&limit=500`;
  const response = await fetch(url, { headers });
  return response.json();
}

async function main() {
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  RESTAURAÇÃO DE RESERVAS - INCIDENTE 2026-01-30");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // 1. Buscar reservas canceladas
  console.log("🔍 Buscando reservas canceladas pela reconciliação...");
  const reservations = await fetchCancelledReservations();
  console.log(`   Encontradas: ${reservations.length} reservas\n`);

  if (reservations.length === 0) {
    console.log("✅ Nenhuma reserva para restaurar!");
    return;
  }

  // 2. Validar cada reserva na Stays.net
  console.log("🔄 Validando reservas na API da Stays.net...\n");

  const toRestore = [];
  const alreadyDeleted = [];
  const apiErrors = [];

  let i = 0;
  for (const res of reservations) {
    i++;
    process.stdout.write(`\r   Progresso: ${i}/${reservations.length} (${Math.round((i / reservations.length) * 100)}%)`);

    const result = await checkStaysReservation(res.external_id);

    if (result.error) {
      apiErrors.push({ ...res, error: result.error });
    } else if (result.exists) {
      const mappedStatus = mapStaysStatus(result.type);
      if (mappedStatus !== "cancelled") {
        toRestore.push({
          ...res,
          staysType: result.type,
          newStatus: mappedStatus,
        });
      } else {
        alreadyDeleted.push(res);
      }
    } else {
      alreadyDeleted.push(res);
    }

    // Rate limiting
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log("\n");

  // 3. Resumo
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  RESUMO DA VALIDAÇÃO");
  console.log("═══════════════════════════════════════════════════════════════\n");
  console.log(`   Total analisadas:        ${reservations.length}`);
  console.log(`   Existem na Stays.net:    ${toRestore.length}`);
  console.log(`   Deletadas/Canceladas:    ${alreadyDeleted.length}`);
  console.log(`   Erros de API:            ${apiErrors.length}`);
  console.log(`\n   📋 Para restaurar:       ${toRestore.length}\n`);

  if (toRestore.length === 0) {
    console.log("✅ Nenhuma reserva precisa ser restaurada.");
    return;
  }

  // 4. Exibir lista
  console.log("Reservas que serão restauradas:");
  console.log("  Código     | External ID                | Check-in   | Stays      | Novo Status");
  console.log("  -----------|----------------------------|------------|------------|------------");

  for (const res of toRestore.slice(0, 20)) {
    console.log(`  ${(res.staysnet_reservation_code || "").padEnd(10)} | ${res.external_id.padEnd(26)} | ${res.check_in} | ${(res.staysType || "").padEnd(10)} | ${res.newStatus}`);
  }

  if (toRestore.length > 20) {
    console.log(`\n  ... e mais ${toRestore.length - 20} reservas`);
  }

  // 5. Confirmar
  console.log("\n═══════════════════════════════════════════════════════════════");

  // Auto-confirm se DRY_RUN=false não estiver setado
  const readline = await import("readline");
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const confirm = await new Promise((resolve) => {
    rl.question(`Deseja restaurar ${toRestore.length} reservas? (sim/não): `, (answer) => {
      rl.close();
      resolve(answer);
    });
  });

  if (confirm !== "sim") {
    console.log("\n❌ Restauração cancelada pelo usuário.");
    return;
  }

  // 6. Executar restauração
  console.log("\n🔄 Restaurando reservas...\n");

  let restored = 0;
  let errors = 0;

  for (const res of toRestore) {
    const success = await restoreReservation(res.id, res.newStatus);
    if (success) {
      restored++;
      console.log(`  ✅ ${res.staysnet_reservation_code || res.external_id} -> ${res.newStatus}`);
    } else {
      errors++;
      console.log(`  ❌ ${res.staysnet_reservation_code || res.external_id} - Erro ao restaurar`);
    }
  }

  // 7. Resumo final
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  RESTAURAÇÃO CONCLUÍDA");
  console.log("═══════════════════════════════════════════════════════════════\n");
  console.log(`   Restauradas com sucesso: ${restored}`);
  console.log(`   Erros na restauração:    ${errors}`);
  console.log("\n✅ Script finalizado!");
}

main().catch(console.error);
