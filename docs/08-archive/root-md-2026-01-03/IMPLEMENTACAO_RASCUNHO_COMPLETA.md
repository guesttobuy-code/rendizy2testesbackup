# ✅ IMPLEMENTAÇÃO: Sistema de Rascunho Completo

## 🎯 Objetivo

**CRÍTICO:** Garantir que nenhum dado cadastrado pelo usuário seja perdido. Todo anúncio iniciado fica salvo como rascunho no backend (SQL) até finalizar.

## 📋 Regra Master

> **Todo anúncio iniciado fica salvo padrão como rascunho até finalizar. Todo o percentual avançado não se perder de jeito nenhum.**

## ✅ Implementação Realizada

### 1. **Backend (SQL) - Migration**

- ✅ Migration criada: `20251202_add_draft_system_properties.sql`
- ✅ Campos adicionados:
  - `status`: 'draft' | 'active' | 'inactive' | 'maintenance'
  - `wizard_data`: JSONB (dados completos do wizard)
  - `completion_percentage`: INTEGER (0-100)
  - `completed_steps`: TEXT[] (array de step IDs)

### 2. **Backend (API) - routes-properties.ts**

- ✅ Suporte a `status='draft'` já implementado
- ✅ Validações relaxadas para rascunhos
- ✅ Campos `wizardData`, `completionPercentage`, `completedSteps` já aceitos

### 3. **Frontend - PropertyEditWizard.tsx**

#### **Modificações:**

1. ✅ **Estado `draftPropertyId`**: Rastreia ID do rascunho no backend
2. ✅ **Função `calculateDraftProgress()`**: Calcula percentual e steps completados
3. ✅ **Função `normalizeWizardDataForDraft()`**: Normaliza dados para criar rascunho
4. ✅ **Função `saveDraftToBackend()`**: Salva/atualiza rascunho no backend
5. ✅ **Modificação `handleSaveAndNext()`**:
   - **Primeiro step:** Cria rascunho no backend
   - **Steps intermediários:** Atualiza rascunho com progresso
   - **Último step:** Mantém como rascunho (será finalizado em `handleFinish`)
6. ✅ **Modificação `handleFinish()`**:
   - Muda `status='draft'` → `status='active'`
   - Define `completionPercentage=100`

### 4. **Frontend - PropertyWizardPage.tsx**

- ✅ Modificado para aceitar `status='draft'` na criação
- ✅ Não redireciona se for rascunho (permite continuar)

## 🔄 Fluxo Completo

### **Modo CRIAÇÃO:**

1. **Step 1 (primeiro step):**

   ```
   Usuário preenche Step 1 → Clica "Salvar e Avançar"
   → saveDraftToBackend() cria rascunho no backend
   → Retorna propertyId
   → Salva propertyId em draftPropertyId
   → Próximos steps usam este ID para atualizar
   ```

2. **Steps 2-N (intermediários):**

   ```
   Usuário preenche step → Clica "Salvar e Avançar"
   → saveDraftToBackend() atualiza rascunho existente
   → Atualiza wizardData, completionPercentage, completedSteps
   → Mantém status='draft'
   ```

3. **Último Step:**
   ```
   Usuário clica "Finalizar"
   → handleFinish() atualiza rascunho
   → Muda status='draft' → 'active'
   → Define completionPercentage=100
   → Redireciona para lista
   ```

### **Modo EDIÇÃO:**

- ✅ Já funcionava corretamente (salva no backend a cada step)
- ✅ Agora também atualiza `completionPercentage` e `completedSteps`

## 📊 Dados Salvos no Backend

```typescript
{
  id: "prop_uuid",
  status: "draft", // ou "active" quando finalizado
  wizardData: {
    // Dados completos do wizard (estrutura aninhada)
    contentType: {...},
    contentLocation: {...},
    // ... todos os dados
  },
  completionPercentage: 45, // Calculado automaticamente
  completedSteps: ["content-type", "content-location"], // Array de IDs
  // ... outros campos normalizados
}
```

## 🎨 Exibição na Lista (Próximo Passo)

**TODO:** Modificar lista de propriedades para:

- Mostrar rascunhos com badge "Rascunho"
- Exibir percentual de conclusão
- Permitir clicar e continuar de onde parou

## ✅ Benefícios

1. ✅ **Persistência garantida:** Dados no SQL, não se perdem
2. ✅ **Visibilidade:** Rascunhos aparecerão na lista (após implementar)
3. ✅ **Continuidade:** Usuário pode continuar de onde parou
4. ✅ **Progresso visível:** Percentual mostra avanço
5. ✅ **Multi-dispositivo:** Funciona em qualquer dispositivo
6. ✅ **Backup automático:** localStorage como fallback

## ⚠️ Observações Importantes

1. **Validações relaxadas:** Rascunhos podem ter dados incompletos
2. **Valores padrão:** Sistema usa valores mínimos para permitir criação
3. **Progresso calculado:** Baseado em steps relevantes para modalidades
4. **Status final:** Só muda para 'active' no último step

## 🧪 Como Testar

1. Acesse `/properties/new`
2. Preencha Step 1 e clique "Salvar e Avançar"
3. Verifique no console: "✅ Rascunho criado no backend: [ID]"
4. Verifique no banco: Propriedade com `status='draft'`
5. Preencha mais alguns steps
6. Verifique: `completionPercentage` e `completedSteps` atualizados
7. Finalize no último step
8. Verifique: `status='active'` e `completionPercentage=100`

## 📝 Próximos Passos

1. ✅ Implementação do backend (já existe)
2. ✅ Implementação do frontend (concluída)
3. ⏳ Modificar lista para mostrar rascunhos
4. ⏳ Permitir continuar rascunho da lista
5. ⏳ Testar fluxo completo
