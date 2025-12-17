// Script para testar criação de rascunho com apenas título no step 07
// Execute no console do navegador (F12) na página http://localhost:5173/properties

(async function () {
  console.log("🧪 [TESTE] Iniciando teste de rascunho com título...");

  // Pegar token do localStorage
  const token = localStorage.getItem("rendizy-token");
  if (!token) {
    console.error("❌ [TESTE] Token não encontrado. Faça login primeiro.");
    return;
  }

  console.log("✅ [TESTE] Token encontrado:", token.substring(0, 20) + "...");

  // URL da API
  const API_BASE_URL =
    "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server";
  const publicAnonKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNzEsImV4cCI6MjA3NzkzMDE3MX0.aljqrK3mKwQ6T6EB_fDPfkbP7QC_hhiZwxUZbtnqVqQ";

  // Dados do rascunho - APENAS com título no step 07
  const draftData = {
    status: "draft",
    type: "loc_casa", // Tipo mínimo necessário
    wizardData: {
      contentType: {
        modalidades: ["buy_sell"],
        propertyType: "individual",
      },
      contentDescription: {
        fixedFields: {
          title: "Teste rascunho", // 🎯 APENAS O TÍTULO
        },
        customFieldsValues: {},
        autoTranslate: false,
      },
    },
    completionPercentage: 5, // Apenas step 07 preenchido
    completedSteps: ["content-description"],
    address: {
      country: "BR",
      city: "Rio de Janeiro",
      state: "RJ",
    },
  };

  console.log(
    "📤 [TESTE] Enviando rascunho:",
    JSON.stringify(draftData, null, 2)
  );

  try {
    // Criar rascunho
    const createResponse = await fetch(`${API_BASE_URL}/properties`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${publicAnonKey}`,
        "X-Auth-Token": token,
      },
      body: JSON.stringify(draftData),
    });

    const createResult = await createResponse.json();
    console.log("📡 [TESTE] Resposta da criação:", createResult);

    if (createResult.success && createResult.data?.id) {
      const draftId = createResult.data.id;
      console.log("✅ [TESTE] Rascunho criado com ID:", draftId);

      // Aguardar um pouco para garantir que foi salvo
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Buscar lista de propriedades
      console.log("🔍 [TESTE] Buscando lista de propriedades...");
      const listResponse = await fetch(`${API_BASE_URL}/properties`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "X-Auth-Token": token,
        },
      });

      const listResult = await listResponse.json();
      console.log("📋 [TESTE] Lista de propriedades:", listResult);

      // Procurar o rascunho na lista
      if (listResult.success && listResult.data) {
        const drafts = Array.isArray(listResult.data)
          ? listResult.data.filter((p) => p.status === "draft")
          : [];

        const foundDraft = drafts.find((p) => p.id === draftId);

        if (foundDraft) {
          console.log("✅ [TESTE] RASCUNHO ENCONTRADO NA LISTA:", foundDraft);
          console.log(
            "✅ [TESTE] Título:",
            foundDraft.wizardData?.contentDescription?.fixedFields?.title
          );
          console.log("✅ [TESTE] Status:", foundDraft.status);
          console.log(
            "✅ [TESTE] Porcentagem:",
            foundDraft.completionPercentage
          );
        } else {
          console.error("❌ [TESTE] Rascunho NÃO encontrado na lista");
          console.log("📊 [TESTE] Rascunhos na lista:", drafts);
        }
      }

      return { success: true, draftId, createResult, listResult };
    } else {
      console.error("❌ [TESTE] Erro ao criar rascunho:", createResult);
      return { success: false, error: createResult };
    }
  } catch (error) {
    console.error("❌ [TESTE] Erro:", error);
    return { success: false, error: error.message };
  }
})();
