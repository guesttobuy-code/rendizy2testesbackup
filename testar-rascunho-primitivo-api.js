/**
 * TESTE PRIMITIVO DE RASCUNHO VIA API
 *
 * Este script testa criar um rascunho da forma mais simples possível
 * diretamente via API, sem passar pela interface
 */

const SUPABASE_URL = "https://odcgnzfremrqnvtitpcc.supabase.co";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/rendizy-server/properties`;

// Token de autenticação (precisa ser um token válido)
// Para testar, você precisa fazer login primeiro e pegar o token do localStorage
const AUTH_TOKEN = process.env.AUTH_TOKEN || "SEU_TOKEN_AQUI";

// ============================================================================
// TESTE 1: Rascunho MÍNIMO (apenas status draft)
// ============================================================================
async function testarRascunhoMinimo() {
  console.log("\n🧪 TESTE 1: Rascunho MÍNIMO (apenas status draft)");
  console.log("=".repeat(60));

  const payload = {
    status: "draft",
  };

  console.log("📤 Payload enviado:", JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": AUTH_TOKEN,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log("📥 Status:", response.status);
    console.log("📥 Resposta:", JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      console.log("✅ SUCESSO! Rascunho criado com ID:", data.data?.id);
      return data.data?.id;
    } else {
      console.log("❌ ERRO:", data.error || data.message);
      return null;
    }
  } catch (error) {
    console.error("❌ Erro na requisição:", error.message);
    return null;
  }
}

// ============================================================================
// TESTE 2: Rascunho com wizard_data vazio
// ============================================================================
async function testarRascunhoComWizardData() {
  console.log("\n🧪 TESTE 2: Rascunho com wizard_data vazio");
  console.log("=".repeat(60));

  const payload = {
    status: "draft",
    wizardData: {},
  };

  console.log("📤 Payload enviado:", JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": AUTH_TOKEN,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log("📥 Status:", response.status);
    console.log("📥 Resposta:", JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      console.log("✅ SUCESSO! Rascunho criado com ID:", data.data?.id);
      return data.data?.id;
    } else {
      console.log("❌ ERRO:", data.error || data.message);
      return null;
    }
  } catch (error) {
    console.error("❌ Erro na requisição:", error.message);
    return null;
  }
}

// ============================================================================
// TESTE 3: Rascunho com apenas um campo preenchido
// ============================================================================
async function testarRascunhoComUmCampo() {
  console.log("\n🧪 TESTE 3: Rascunho com apenas um campo (name)");
  console.log("=".repeat(60));

  const payload = {
    status: "draft",
    name: "Teste Rascunho Primitivo",
    wizardData: {
      contentDescription: {
        title: "Teste Rascunho Primitivo",
      },
    },
  };

  console.log("📤 Payload enviado:", JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": AUTH_TOKEN,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    console.log("📥 Status:", response.status);
    console.log("📥 Resposta:", JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      console.log("✅ SUCESSO! Rascunho criado com ID:", data.data?.id);
      return data.data?.id;
    } else {
      console.log("❌ ERRO:", data.error || data.message);
      return null;
    }
  } catch (error) {
    console.error("❌ Erro na requisição:", error.message);
    return null;
  }
}

// ============================================================================
// EXECUTAR TESTES
// ============================================================================
async function executarTestes() {
  console.log("🚀 INICIANDO TESTES PRIMITIVOS DE RASCUNHO");
  console.log("=".repeat(60));
  console.log("⚠️  IMPORTANTE: Configure AUTH_TOKEN antes de executar!");
  console.log('   export AUTH_TOKEN="seu_token_aqui"');
  console.log("   ou edite o arquivo e coloque o token diretamente");
  console.log("=".repeat(60));

  if (!AUTH_TOKEN || AUTH_TOKEN === "SEU_TOKEN_AQUI") {
    console.error("❌ ERRO: AUTH_TOKEN não configurado!");
    console.log("   Para obter o token:");
    console.log("   1. Faça login na aplicação");
    console.log("   2. Abra o console do navegador (F12)");
    console.log('   3. Execute: localStorage.getItem("rendizy-token")');
    console.log(
      '   4. Copie o token e configure: export AUTH_TOKEN="token_aqui"'
    );
    process.exit(1);
  }

  // Executar testes sequencialmente
  await testarRascunhoMinimo();
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Aguardar 1s

  await testarRascunhoComWizardData();
  await new Promise((resolve) => setTimeout(resolve, 1000)); // Aguardar 1s

  await testarRascunhoComUmCampo();

  console.log("\n✅ TESTES CONCLUÍDOS");
  console.log("=".repeat(60));
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  executarTestes().catch(console.error);
}

export {
  testarRascunhoMinimo,
  testarRascunhoComWizardData,
  testarRascunhoComUmCampo,
};
