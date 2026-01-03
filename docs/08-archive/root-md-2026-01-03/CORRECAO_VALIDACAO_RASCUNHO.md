# ✅ Correção: Validação de Rascunho no Backend

## 🐛 Problema Identificado

O backend estava rejeitando a criação de rascunhos com erro 400 (Validation error), mesmo quando `status="draft"`.

## ✅ Correções Aplicadas

### 1. **Verificação de Código Duplicado Apenas para Não-Rascunhos**

**Antes:** Verificava código duplicado para TODOS os properties, incluindo rascunhos.

**Depois:** Verifica código duplicado apenas se `!isDraft`.

```typescript
// ✅ RASCUNHO: Verificar código duplicado apenas se NÃO for draft
if (!isDraft) {
  // Verificar código duplicado...
}
```

### 2. **Valores Padrão Garantidos para Rascunhos**

Adicionados valores padrão para todos os campos obrigatórios quando for rascunho:

- `name`: "Rascunho de Propriedade"
- `code`: `DRAFT-${timestamp}`
- `type`: "loc_casa"
- `address`: { city: "Rio de Janeiro", state: "RJ", country: "BR" }
- `maxGuests`: 1

### 3. **Logs Detalhados Adicionados**

**Backend:**

- Log do body recebido
- Log após normalização
- Log quando aplica valores padrão para rascunho
- Log quando pula verificação de código duplicado

**Frontend:**

- Log completo dos dados que serão enviados
- Log da resposta do backend

## 🧪 Como Testar

1. **Abrir console do navegador (F12)**
2. **Navegar para `/properties`**
3. **Clicar "Nova Propriedade"**
4. **Preencher Step 1:**
   - Modalidade: "Compra e venda"
   - Tipo: "Casa"
   - Nome: "Rafa Teste"
5. **Clicar "Salvar e Avançar"**
6. **Verificar console:**
   - `📤 [Wizard] DADOS QUE SERÃO ENVIADOS PARA BACKEND`
   - `📡 [Wizard] RESPOSTA DO BACKEND`
   - Deve mostrar `success: true` e `dataId: [UUID]`
7. **Voltar para `/properties`**
8. **Verificar:** Rascunho deve aparecer na lista

## 📝 Logs Esperados

### Frontend:

```
📤 [Wizard] DADOS QUE SERÃO ENVIADOS PARA BACKEND: {
  name: "Rafa Teste",
  code: "...",
  type: "loc_casa",
  status: "draft",
  ...
}
📡 [Wizard] RESPOSTA DO BACKEND: {
  success: true,
  dataId: "uuid-here"
}
```

### Backend (logs do Supabase):

```
📥 [createProperty] Body recebido: { status: "draft", ... }
🔄 [createProperty] Após normalização: { isDraft: true, ... }
📝 [createProperty] RASCUNHO - Aplicando valores padrão mínimos
📝 [createProperty] Rascunho - pulando verificação de código duplicado
```

## ✅ Resultado Esperado

- ✅ Rascunho criado com sucesso no backend
- ✅ Rascunho aparece na lista de propriedades
- ✅ Sem erros de validação
