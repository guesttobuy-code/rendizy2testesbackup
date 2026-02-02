# ⚡ TESTE: SALVAR CAMPO "IDENTIFICAÇÃO INTERNA"

**Versão:** v1.0.103.326  
**Data:** 2025-12-13  
**Objetivo:** Testar salvamento ISOLADO do campo "Identificação Interna" (title)

---

## 🎯 O QUE FOI SIMPLIFICADO

### ❌ ANTES (Complexo):
- Salvava 7 campos de uma vez
- Lógica confusa com JSONB
- Difícil debugar

### ✅ AGORA (Simples):
- Salva APENAS o campo `title`
- Logs ultra-detalhados
- Fácil identificar problemas

---

## 📋 PASSO A PASSO DO TESTE

### 1️⃣ ABRA O CONSOLE (F12)
- Abra DevTools do navegador
- Vá na aba "Console"
- **DEIXE ABERTO durante todo o teste**

### 2️⃣ RECARREGUE A PÁGINA
```
Ctrl + R  (ou Cmd + R no Mac)
```
- Deve aparecer: `✅ Anúncio carregado com sucesso`
- Anote o valor atual do campo "Identificação Interna"

### 3️⃣ EDITE O CAMPO
- Clique no campo "Identificação Interna"
- Mude de `Teste Rafa` para `Teste Rafa EDITADO`
- **NÃO clique em nada ainda**

### 4️⃣ VERIFIQUE O AVISO LARANJA
✅ **DEVE APARECER:**
```
⚠️ Mudanças não salvas - clique em SALVAR para persistir
```

✅ **BOTÃO DEVE MUDAR:**
- De: `💾 Salvar` (cinza)
- Para: `💾 SALVAR AGORA!` (laranja pulsando)

### 5️⃣ CLIQUE NO BOTÃO "SALVAR AGORA!"
- Clique UMA vez
- **ATENÇÃO:** Aguarde os logs no console

---

## 📊 LOGS ESPERADOS NO CONSOLE

Se tudo der certo, você verá:

```
========================================
🚀 [SAVE] INICIANDO SALVAMENTO DO TÍTULO
========================================
📊 [SAVE] ID do anúncio: 9f6cad48-42e9-4ed5-b766-82127a62dce2
📊 [SAVE] Valor do título: Teste Rafa EDITADO
📊 [SAVE] Título length: 18
📊 [SAVE] Título trimmed: Teste Rafa EDITADO
📋 [SAVE] Título preparado: Teste Rafa EDITADO
📤 [SAVE] URL do endpoint: https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/properties/save-field
📤 [SAVE] Método: POST
📤 [SAVE] Payload JSON: {
  "anuncio_id": "9f6cad48-42e9-4ed5-b766-82127a62dce2",
  "field": "title",
  "value": "Teste Rafa EDITADO"
}
⏳ [SAVE] Enviando requisição...
📥 [SAVE] Resposta recebida!
📥 [SAVE] Status HTTP: 200
📥 [SAVE] JSON parseado: { "ok": true, "anuncio": {...} }
✅✅✅ [SAVE] SALVAMENTO 100% CONCLUÍDO! ✅✅✅
🔄 [SAVE] Recarregando página em 1.5s para confirmar...
========================================
```

---

## ✅ COMO SABER SE SALVOU?

### Confirmação 1: Toast Verde
- Deve aparecer mensagem: `✅ Título salvo com sucesso!`

### Confirmação 2: Página Recarrega
- Após 1.5 segundos, página recarrega automaticamente

### Confirmação 3: Valor Persiste
- Após reload, campo mostra `Teste Rafa EDITADO`
- **Se voltar para valor antigo = NÃO SALVOU!**

---

## ❌ ERROS POSSÍVEIS

### Erro 1: ID não definido
```
❌ [SAVE] ERRO CRÍTICO: ID do anúncio não definido!
```
**Solução:** Anúncio não foi carregado. Recarregue página.

### Erro 2: Título vazio
```
❌ [SAVE] ERRO: Título está vazio!
```
**Solução:** Digite algo no campo antes de salvar.

### Erro 3: HTTP 404
```
❌ [SAVE] Status HTTP: 404
```
**Solução:** Endpoint não existe. Backend não deployado.

### Erro 4: HTTP 500
```
❌ [SAVE] Status HTTP: 500
```
**Solução:** Erro no servidor. Ver logs do backend.

### Erro 5: Não é JSON
```
❌ [SAVE] ERRO ao parsear JSON
```
**Solução:** Backend retornou HTML/texto. Ver resposta raw.

---

## 🔍 VERIFICAR NO BANCO DE DADOS

### Opção 1: Supabase Dashboard
1. Acesse: https://supabase.com/dashboard
2. Vá em `Table Editor` > `anuncios_drafts`
3. Procure ID: `9f6cad48-42e9-4ed5-b766-82127a62dce2`
4. Verifique coluna `title`
5. **Se tiver o valor editado = SALVOU! ✅**

### Opção 2: SQL Query
```sql
SELECT 
  id,
  title,
  data->>'title' as title_in_jsonb,
  updated_at
FROM anuncios_drafts
WHERE id = '9f6cad48-42e9-4ed5-b766-82127a62dce2';
```

---

## 🚨 SE NÃO FUNCIONAR

### 1. Copie TODOS os logs do console
- Selecione tudo
- Ctrl+C
- Cole aqui para análise

### 2. Verifique URL da API
```javascript
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Key:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20));
```

### 3. Teste endpoint direto via cURL
```bash
curl -X POST https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/properties/save-field \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "anuncio_id": "9f6cad48-42e9-4ed5-b766-82127a62dce2",
    "field": "title",
    "value": "Teste Manual"
  }'
```

---

## 📌 IMPORTANTE

- **NÃO edite outros campos** - Teste APENAS o título
- **NÃO feche o console** - Precisamos ver os logs
- **NÃO clique várias vezes** - Apenas 1 clique no SALVAR
- **AGUARDE o reload** - Confirma que persistiu

---

## ✅ PRÓXIMOS PASSOS

Quando este campo funcionar:
1. ✅ Título (Identificação Interna)
2. ⏳ Tipo de Local
3. ⏳ Tipo de Acomodação
4. ⏳ Subtipo
5. ⏳ Modalidades
6. ⏳ Estrutura
7. ⏳ Descrição

**Um campo de cada vez, garantindo que salva antes de passar pro próximo!**
