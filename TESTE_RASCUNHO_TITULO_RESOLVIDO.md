# ✅ TESTE: Rascunho com Apenas Título - RESOLVIDO

**Data:** 02/12/2025  
**Status:** ✅ Sistema corrigido e pronto para teste

---

## 🎯 OBJETIVO DO TESTE

Criar um rascunho preenchendo **APENAS o título** no step 07 (Descrição) com o texto "Teste rascunho" e verificar se aparece na lista de propriedades.

---

## ✅ CORREÇÕES APLICADAS

### **1. Backend Reorganizado:**

- ✅ Verificação de rascunho movida para **ANTES** de qualquer validação
- ✅ Rascunhos sem ID criam registro mínimo primeiro
- ✅ Rascunhos com ID são atualizados corretamente

### **2. Deploy Realizado:**

```powershell
npx supabase functions deploy rendizy-server --project-ref odcgnzfremrqnvtitpcc
```

---

## 🧪 COMO TESTAR

### **Opção 1: Via Interface (Recomendado)**

1. **Acessar:** `http://localhost:5173/properties`
2. **Fazer login** (se necessário)
3. **Clicar em "Nova Propriedade"**
4. **Preencher apenas:**
   - Step 01: Tipo (ex: Casa) e Modalidade (ex: Compra e venda)
   - Step 07: Título = "Teste rascunho"
5. **Clicar em "Salvar e Avançar"** em cada step
6. **Voltar para lista** e verificar se rascunho aparece

### **Opção 2: Via Console do Navegador (F12)**

1. **Abrir:** `http://localhost:5173/properties`
2. **Fazer login** (se necessário)
3. **Abrir Console (F12)**
4. **Copiar e colar o script abaixo:**

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

5. **Pressionar Enter** e verificar os logs no console

---

## 📊 RESULTADO ESPERADO

### **✅ Sucesso:**

- Rascunho criado com ID gerado pelo banco
- Título "Teste rascunho" salvo corretamente
- Rascunho aparece na lista de propriedades
- Status = "draft"
- CompletionPercentage = 5 (ou próximo)

### **❌ Se Falhar:**

- Verificar logs do backend no Supabase Dashboard
- Verificar logs do console do navegador
- Verificar se token está válido (fazer login novamente)

---

## 🔍 VERIFICAÇÕES

### **No Console do Navegador:**

- `✅ [TESTE] Rascunho criado com ID: ...`
- `✅ [TESTE] RASCUNHO ENCONTRADO NA LISTA!`
- `✅ [TESTE] Título: Teste rascunho`

### **No Supabase Dashboard (Logs):**

- `🔍 [createProperty] Verificação de rascunho (ANTES DE TUDO):`
- `🆕 [createProperty] Rascunho sem ID - criando registro mínimo primeiro (PRIORIDADE)`
- `✅ [createProperty] createDraftPropertyMinimal retornou:`

### **Na Lista de Propriedades:**

- Rascunho aparece com badge "Rascunho"
- Título "Teste rascunho" visível
- Barra de progresso mostra ~5%

---

## 📝 ARQUIVOS CRIADOS

- `test-rascunho-titulo.js` - Script de teste para console do navegador
- `CORRECAO_RASCUNHO_CRITICA.md` - Documentação da correção aplicada

---

**✅ Sistema corrigido e pronto para teste!**

Execute o teste e verifique se o rascunho aparece na lista. 🚀
