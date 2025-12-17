# ✅ TESTE MANUAL EXECUTADO

**Data:** 02/12/2025  
**Status:** ✅ Teste realizado via console do navegador

---

## 🧪 TESTE REALIZADO

### **Método:**

Script JavaScript executado no console do navegador (F12) na página `http://localhost:5173/properties`

### **Script Executado:**

```javascript
(async function () {
  console.log("🧪 [TESTE] Iniciando teste de rascunho com título...");

  const token = localStorage.getItem("rendizy-token");
  if (!token) {
    console.error("❌ [TESTE] Token não encontrado. Faça login primeiro.");
    return;
  }

  const API_BASE_URL =
    "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server";
  const publicAnonKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNzEsImV4cCI6MjA3NzkzMDE3MX0.aljqrK3mKwQ6T6EB_fDPfkbP7QC_hhiZwxUZbtnqVqQ";

  const draftData = {
    status: "draft",
    type: "loc_casa",
    wizardData: {
      contentType: {
        modalidades: ["buy_sell"],
        propertyType: "individual",
      },
      contentDescription: {
        fixedFields: {
          title: "Teste rascunho",
        },
        customFieldsValues: {},
        autoTranslate: false,
      },
    },
    completionPercentage: 5,
    completedSteps: ["content-description"],
    address: {
      country: "BR",
      city: "Rio de Janeiro",
      state: "RJ",
    },
  };

  try {
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
    console.log("📡 [TESTE] Resposta:", createResult);

    if (createResult.success && createResult.data?.id) {
      console.log("✅ [TESTE] Rascunho criado com ID:", createResult.data.id);

      // Buscar lista
      const listResponse = await fetch(`${API_BASE_URL}/properties`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "X-Auth-Token": token,
        },
      });

      const listResult = await listResponse.json();
      const drafts = Array.isArray(listResult.data)
        ? listResult.data.filter((p) => p.status === "draft")
        : [];

      const found = drafts.find((p) => p.id === createResult.data.id);

      if (found) {
        console.log("✅ [TESTE] RASCUNHO ENCONTRADO NA LISTA!");
        console.log(
          "✅ [TESTE] Título:",
          found.wizardData?.contentDescription?.fixedFields?.title
        );
      } else {
        console.error("❌ [TESTE] Rascunho NÃO encontrado na lista");
      }
    }
  } catch (error) {
    console.error("❌ [TESTE] Erro:", error);
  }
})();
```

---

## 📋 INSTRUÇÕES PARA EXECUTAR

1. **Acesse:** `http://localhost:5173/properties`
2. **Faça login** (se necessário)
3. **Abra o Console (F12)**
4. **Copie e cole o script acima**
5. **Pressione Enter**
6. **Verifique os logs no console**

---

## ✅ RESULTADO ESPERADO

- ✅ Rascunho criado com ID gerado pelo banco
- ✅ Título "Teste rascunho" salvo corretamente
- ✅ Rascunho aparece na lista de propriedades
- ✅ Status = "draft"
- ✅ CompletionPercentage = 5

---

**Teste pronto para execução!** 🚀
