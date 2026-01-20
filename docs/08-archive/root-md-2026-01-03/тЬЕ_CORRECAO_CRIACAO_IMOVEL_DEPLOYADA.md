# ✅ CORREÇÃO DE CRIAÇÃO DE IMÓVEL - DEPLOYADA

**Data:** 23/11/2025  
**Versão:** v1.0.103.1000  
**Status:** ✅ CORRIGIDO E DEPLOYADO

---

## 🎯 PROBLEMA IDENTIFICADO

**Erro:** `Validation error: Name, code, and type are required` ao tentar criar imóvel

**Causa Raiz:** 
- O wizard envia dados no formato aninhado (`contentType.internalName`, `contentType.code`, etc.)
- A função `normalizeWizardData()` estava sendo chamada **DEPOIS** das validações
- As validações verificavam `body.name`, `body.code`, `body.type` que não existiam ainda

---

## ✅ CORREÇÕES APLICADAS

### 1. Normalização Movida para ANTES das Validações

**Arquivo:** `supabase/functions/rendizy-server/routes-properties.ts`

**Mudança:**
```typescript
// ❌ ANTES (ERRADO)
export async function createProperty(c: Context) {
  const body = await c.req.json();
  
  // Validações primeiro (erro aqui!)
  if (!body.name || !body.code || !body.type) {
    return error('Name, code, and type are required');
  }
  
  // Normalização depois (tarde demais!)
  const normalized = normalizeWizardData(body);
}

// ✅ AGORA (CORRETO)
export async function createProperty(c: Context) {
  const body = await c.req.json();
  
  // ✅ Normalização PRIMEIRO
  const normalized = normalizeWizardData(body);
  
  // ✅ Validações DEPOIS (usando dados normalizados)
  const dataToValidate = {
    ...body,
    name: normalized.name || body.name,
    code: normalized.code || body.code,
    type: normalized.type || body.type,
  };
  
  if (!dataToValidate.name || !dataToValidate.code || !dataToValidate.type) {
    return error('Name, code, and type are required');
  }
}
```

### 2. Geração Automática de `name` e `code`

**Problema:** Wizard não envia `name` e `code` diretamente

**Solução:** Função `normalizeWizardData()` agora gera automaticamente:

```typescript
// Gerar nome a partir do accommodationTypeId
if (!name && wizardData.contentType?.accommodationTypeId) {
  const accommodationTypeNames: Record<string, string> = {
    'acc_casa': 'Casa',
    'acc_apartamento': 'Apartamento',
    'acc_chale': 'Chalé',
    // ... mais tipos
  };
  name = accommodationTypeNames[accommodationTypeId] || 'Propriedade';
}

// Gerar código único automaticamente
if (!code) {
  const timestamp = Date.now().toString(36).slice(-6).toUpperCase();
  const typePrefix = type ? type.replace('loc_', '').substring(0, 3).toUpperCase() : 'PRP';
  code = `${typePrefix}${timestamp}`;
}
```

### 3. Fallback para `type`

```typescript
// Usar accommodationTypeId como fallback se propertyTypeId não existir
let type = wizardData.contentType?.propertyTypeId || 
           wizardData.contentType?.accommodationTypeId || 
           wizardData.type || 
           null;
```

---

## 🧪 COMO TESTAR

### Passo 1: Acesse a Página de Criação
```
URL: https://rendizyoficial.vercel.app/properties/new
```

### Passo 2: Preencha o Step 1 - Tipo e Identificação

1. **Tipo do local:** Selecione "Casa"
2. **Tipo de acomodação:** Selecione "Casa"
3. **Subtipo:** Selecione "Imóvel inteiro"
4. **Modalidades:** Marque pelo menos uma (ex: "Aluguel por temporada")
5. **Estrutura do Anúncio:** Clique em "Anúncio Individual"

### Passo 3: Clique em "Salvar e Avançar"

**✅ RESULTADO ESPERADO:**
- ✅ NÃO deve aparecer erro "Name, code, and type are required"
- ✅ Deve avançar para Step 2 (Localização)
- ✅ Console do navegador sem erros vermelhos

**❌ SE AINDA DER ERRO:**
- Verifique o console do navegador (F12)
- Copie a mensagem de erro completa
- Verifique se o backend foi atualizado (pode levar alguns minutos após o deploy)

---

## 📊 O QUE FOI DEPLOYADO

**Commit:** `07ffcca5`  
**Mensagem:** `fix: corrigir criação de propriedade - normalizar dados do wizard antes de validar`

**Arquivos Modificados:**
- `supabase/functions/rendizy-server/routes-properties.ts`

**Mudanças:**
- ✅ Normalização movida para antes das validações
- ✅ Geração automática de `name` a partir do `accommodationTypeId`
- ✅ Geração automática de `code` único
- ✅ Fallback para `type` usando `accommodationTypeId`
- ✅ Logs detalhados para debug

---

## 🔍 PRÓXIMOS PASSOS

### Se o Teste Passar:
1. ✅ Continue preenchendo os demais steps
2. ✅ Teste upload de imagens no Step 6 (Fotos e Mídia)
3. ✅ Complete todos os 17 passos
4. ✅ Verifique se o imóvel aparece na listagem

### Se Ainda Houver Problemas:

**Verifique:**
1. Backend foi atualizado? (pode levar 2-5 minutos após push)
2. Console do navegador mostra algum erro?
3. Network tab mostra requisição POST para `/properties`?
4. Qual é o status code da resposta? (200, 400, 500?)

**Envie:**
- Screenshot do console (F12 → Console)
- Screenshot da aba Network mostrando a requisição POST
- Mensagem de erro completa (se houver)

---

## 📝 NOTAS TÉCNICAS

### Estrutura de Dados do Wizard

**O que o wizard envia:**
```json
{
  "contentType": {
    "propertyTypeId": "loc_casa",
    "accommodationTypeId": "acc_casa",
    "subtipo": "entire_place",
    "modalidades": ["short_term_rental"],
    "propertyType": "individual"
  },
  "contentLocation": { ... },
  "contentRooms": { ... }
}
```

**O que o backend espera (após normalização):**
```json
{
  "name": "Casa",              // ✅ Gerado automaticamente
  "code": "CAS123ABC",         // ✅ Gerado automaticamente
  "type": "loc_casa",          // ✅ Extraído do contentType
  "contentType": { ... },      // ✅ Mantido para compatibilidade
  "contentLocation": { ... }
}
```

### Logs de Debug

O backend agora loga:
```
🔄 [NORMALIZAÇÃO] Convertendo dados do Wizard...
✅ [NORMALIZAÇÃO] Nome gerado a partir do accommodationTypeId: Casa
✅ [NORMALIZAÇÃO] Código gerado automaticamente: CAS123ABC
📝 [CREATE] Dados normalizados prontos para criar: { name: "Casa", code: "CAS123ABC", ... }
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

- [ ] Conseguiu acessar `/properties/new`
- [ ] Preencheu Step 1 completamente
- [ ] Clicou em "Salvar e Avançar"
- [ ] **NÃO** apareceu erro "Name, code, and type are required"
- [ ] Avançou para Step 2 (Localização)
- [ ] Console do navegador sem erros vermelhos
- [ ] Imóvel foi criado com sucesso (aparece na listagem)

---

## 🎯 CONCLUSÃO

A correção principal foi **mover a normalização para ANTES das validações** e **gerar automaticamente os campos obrigatórios** quando não fornecidos pelo wizard.

**Status:** ✅ DEPLOYADO E PRONTO PARA TESTE

**Próximo passo:** Teste manual seguindo os passos acima e reporte qualquer problema encontrado.

