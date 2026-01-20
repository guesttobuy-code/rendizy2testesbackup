# Changelog — 2026-01-16

## 📅 Calendário — Melhorias de UX

### 1. Edição de Datas nos Modais (commit: 34f8d0b)

**Problema:** Usuário só podia aplicar ações no período pré-selecionado no calendário.

**Solução:** Adicionado `DateRangePicker` em todos os modais do calendário permitindo editar o período antes de salvar.

**Arquivos modificados:**
- `components/BulkPriceConditionModal.tsx`
- `components/BulkRestrictionsModal.tsx`
- `components/BulkMinNightsModal.tsx`
- `components/PropertyConditionModal.tsx`
- `components/PropertyRestrictionsModal.tsx`
- `components/MinNightsEditModal.tsx`
- `components/QuotationModal.tsx`
- `components/PriceEditModal.tsx`

**Comportamento:**
- Botão "Editar" ao lado do período selecionado
- Abre DateRangePicker inline para ajustar datas
- Usa `effectiveStartDate`/`effectiveEndDate` que respeitam edição do usuário

---

### 2. Indicadores de Loading em Modais (commit: 0b3abf7)

**Problema:** Ao aplicar condições para períodos longos (ex: 1 ano = 365+ dias), a operação demorava ~2 minutos sem feedback visual, confundindo o usuário.

**Solução:** Implementado sistema completo de loading states com:

1. **Spinner animado** (`Loader2` do lucide-react) no botão
2. **Toast notifications** via `sonner`:
   - `toast.loading()` — mostra descrição do que está sendo feito
   - `toast.success()` — confirma conclusão
   - `toast.error()` — mostra erro se falhar
3. **Botões desabilitados** durante processamento (previne cliques duplos)
4. **Texto contextual** do botão muda (ex: "Aplicar" → "Aplicando...")

**Padrão implementado:**
```tsx
const [saving, setSaving] = useState(false);

const handleSave = async () => {
  setSaving(true);
  const toastId = toast.loading('Aplicando...', {
    description: `${days} dias serão atualizados. Aguarde...`
  });

  try {
    await onSave({ ... });
    toast.success('Sucesso!', { id: toastId, description: '...' });
    onClose();
  } catch (error) {
    toast.error('Erro', { id: toastId, description: error.message });
  } finally {
    setSaving(false);
  }
};
```

**Arquivos modificados (8 modais):**
- `BulkPriceConditionModal.tsx` — "Aplicando condição..."
- `BulkRestrictionsModal.tsx` — "Aplicando restrição..."
- `BulkMinNightsModal.tsx` — "Aplicando mínimo de noites..."
- `PropertyConditionModal.tsx` — "Aplicando condição..."
- `PropertyRestrictionsModal.tsx` — "Aplicando/Removendo restrição..."
- `MinNightsEditModal.tsx` — "Salvando mínimo de noites..."
- `QuotationModal.tsx` — "Criando cotação..."
- `PriceEditModal.tsx` — "Salvando preços..."

---

### 3. Persistência de Preço Base (commit: dfcb863)

**Problema:** Ao usar "Save All", o preço base por dia não era persistido.

**Solução:** Garantido que `base_price` é salvo no batch de `calendar-rules`.

---

## 🔧 Detalhes Técnicos

### Interfaces atualizadas
Todos os modais tiveram a interface `onSave` atualizada para aceitar `Promise<void>`:
```tsx
onSave: (data: {...}) => void | Promise<void>;
```

### Dependências utilizadas
- `lucide-react` — ícone `Loader2` com `animate-spin`
- `sonner` — biblioteca de toast já existente no projeto
- `DateRangePicker` — componente existente em `components/DateRangePicker.tsx`

---

## 📊 Impacto

| Métrica | Antes | Depois |
|---------|-------|--------|
| Feedback durante operação | Nenhum | Toast + Spinner |
| Flexibilidade de período | Fixo | Editável |
| Prevenção de clique duplo | Não | Sim |
| Tratamento de erros | Console | Toast visível |

---

## 🏷️ Tags de Estabilidade

```
RENDIZY_STABLE_TAG v1.0.103.601 (2026-01-16)
- Loading states em todos os modais do calendário
- Edição de datas inline nos modais
```

---

## 📝 Commits relacionados

```
0b3abf7 feat(ux): adiciona indicadores de loading em todos os modais do calendário
34f8d0b feat: adiciona edição de datas em todos os modais do calendário
dfcb863 fix: persist base nightly price on save all
ea89470 fix: calendar base price fallback
```
