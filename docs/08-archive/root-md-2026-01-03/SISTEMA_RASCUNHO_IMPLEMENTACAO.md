# 🎯 SISTEMA DE RASCUNHO - Implementação Crítica

## 📋 Problema Identificado

**CRÍTICO:** Usuário perde dados ao tentar criar anúncio e não conseguir finalizar.

**Situação atual:**

- Modo criação: Salva apenas no `localStorage`
- Se página atualizar/fechar: Dados são perdidos
- Rascunho não aparece na lista de anúncios
- Não há persistência no backend

## ✅ Solução: Rascunho no Backend (SQL)

### Regra Master

> **Todo anúncio iniciado fica salvo como rascunho no backend até finalizar. O percentual avançado não se perde de jeito nenhum.**

### Estrutura no Backend

**Migration já existe:** `20251202_add_draft_system_properties.sql`

**Campos adicionados:**

- `status`: 'draft' | 'active' | 'inactive' | 'maintenance'
- `wizard_data`: JSONB (dados completos do wizard)
- `completion_percentage`: INTEGER (0-100)
- `completed_steps`: TEXT[] (array de step IDs completados)

### Fluxo de Salvamento

#### **Modo CRIAÇÃO:**

1. **Step 1 (primeiro step):**

   - Criar rascunho no backend com `status='draft'`
   - Salvar `wizardData`, `completionPercentage=0`, `completedSteps=[]`
   - Retornar `propertyId` para usar nos próximos steps

2. **Steps 2-N (intermediários):**

   - Atualizar rascunho no backend
   - Atualizar `wizardData`, `completionPercentage`, `completedSteps`
   - Manter `status='draft'`

3. **Último Step:**
   - Atualizar rascunho com todos os dados
   - Mudar `status='active'` (finalizar)
   - Limpar rascunho do localStorage

#### **Modo EDIÇÃO:**

- Já funciona corretamente (salva no backend a cada step)
- Apenas garantir que atualiza `completionPercentage` e `completedSteps`

### Cálculo de Progresso

```typescript
function calculateProgress(
  completedSteps: Set<string>,
  modalidades: string[]
): {
  percentage: number;
  completedStepsArray: string[];
} {
  const relevantSteps = getRelevantSteps(modalidades);
  const completed = Array.from(completedSteps).filter((stepId) =>
    isStepRelevantForModalities(stepId, modalidades)
  );

  const percentage =
    relevantSteps.length > 0
      ? Math.round((completed.length / relevantSteps.length) * 100)
      : 0;

  return {
    percentage,
    completedStepsArray: completed,
  };
}
```

### Modificações Necessárias

1. **PropertyEditWizard.tsx:**

   - Modificar `handleSaveAndNext` para criar/atualizar rascunho no backend
   - Adicionar função `saveDraftToBackend()`
   - Modificar `handleFinish` para mudar status para 'active'

2. **PropertyWizardPage.tsx:**

   - Modificar `handleSave` para aceitar `status='draft'`
   - Retornar `propertyId` após criar rascunho
   - Atualizar state com `propertyId` para próximos steps

3. **Lista de Propriedades:**
   - Mostrar rascunhos com badge "Rascunho"
   - Exibir percentual de conclusão
   - Permitir continuar de onde parou

### Exemplo de Payload para Backend

```typescript
{
  status: 'draft', // ou 'active' no último step
  wizardData: formData, // Dados completos do wizard
  completionPercentage: 45, // Calculado
  completedSteps: ['content-type', 'content-location'], // Array de IDs
  // ... outros campos normalizados
}
```

### Benefícios

1. ✅ **Persistência garantida:** Dados no SQL, não se perdem
2. ✅ **Visibilidade:** Rascunhos aparecem na lista
3. ✅ **Continuidade:** Usuário pode continuar de onde parou
4. ✅ **Progresso visível:** Percentual mostra avanço
5. ✅ **Multi-dispositivo:** Funciona em qualquer dispositivo (não depende de localStorage)
