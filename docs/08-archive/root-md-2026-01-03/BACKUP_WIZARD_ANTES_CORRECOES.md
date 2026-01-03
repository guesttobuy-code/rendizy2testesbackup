# 📦 BACKUP: Estado do Wizard Antes das Correções

**Data:** 2025-12-02  
**Motivo:** Correções solicitadas pelo usuário - backup para segurança

## ⚠️ IMPORTANTE

Este documento serve como referência caso alguma alteração cause problemas.  
**NÃO DELETAR** até confirmar que todas as correções funcionam corretamente.

---

## 📋 Checklist de Correções Solicitadas

- [ ] **Step 03 (Amenidades do Local)**: Filtrar campos de temporada
- [ ] **Step 06 (Fotos e Mídia)**: Mudar para EXIBIR fotos (não upload)
- [ ] **Step 03 (Cômodos)**: Adicionar texto sobre upload de fotos
- [ ] **Step 07 (Descrição)**: Adicionar campo "Título do Anúncio" (50 caracteres)
- [ ] **Step 01 Financeiro**: Para compra e venda = recomendado (não obrigatório)
- [ ] **Step 02 Financeiro**: Remover valores do step 01 conteúdo + filtrar por modalidade
- [ ] **Step 01 Configurações**: Para compra e venda = opcional (não obrigatório)
- [ ] **Step 02 Configurações**: Confirmar que está opcional
- [ ] **Erro no finalizar**: Corrigir erro de sessão

---

## 🔍 Arquivos Principais

### 1. PropertyEditWizard.tsx

- **Localização:** `RendizyPrincipal/components/PropertyEditWizard.tsx`
- **Função:** Componente principal do wizard
- **Estado atual:** Funcionando com salvamento por step e filtragem de steps por modalidade

### 2. ContentLocationAmenitiesStep.tsx

- **Localização:** `RendizyPrincipal/components/wizard-steps/ContentLocationAmenitiesStep.tsx`
- **Problema:** Campos de temporada aparecem para todas modalidades
- **Campos a filtrar:** Check-in/checkout expressos, Recepção 24 horas

### 3. ContentPhotosStep.tsx

- **Localização:** `RendizyPrincipal/components/wizard-steps/ContentPhotosStep.tsx`
- **Problema:** Permite upload de fotos (deveria apenas EXIBIR)
- **Mudança:** Deve buscar fotos dos cômodos e exibir para organização

### 4. ContentRoomsStep.tsx

- **Localização:** `RendizyPrincipal/components/wizard-steps/ContentRoomsStep.tsx`
- **Mudança:** Adicionar texto explicativo sobre upload de fotos

### 5. ContentDescriptionStep.tsx

- **Localização:** `RendizyPrincipal/components/wizard-steps/ContentDescriptionStep.tsx`
- **Mudança:** Adicionar campo "Título do Anúncio" com limite de 50 caracteres

### 6. ContentTypeStep.tsx

- **Localização:** `RendizyPrincipal/components/wizard-steps/ContentTypeStep.tsx`
- **Mudança:** Remover seção "Valores - Compra e Venda" (mover para step financeiro)

### 7. FinancialContractStep.tsx

- **Localização:** `RendizyPrincipal/components/wizard-steps/FinancialContractStep.tsx`
- **Mudança:** Para compra e venda = recomendado (não obrigatório)

### 8. FinancialResidentialPricingStep.tsx

- **Localização:** `RendizyPrincipal/components/wizard-steps/FinancialResidentialPricingStep.tsx`
- **Mudança:** Filtrar seção de locação quando modalidade = apenas compra e venda

### 9. SettingsRulesStep.tsx

- **Localização:** `RendizyPrincipal/components/wizard-steps/SettingsRulesStep.tsx`
- **Mudança:** Para compra e venda = opcional (não obrigatório)

---

## ✅ Funcionalidades que JÁ FUNCIONAM (NÃO MEXER)

1. ✅ Salvamento por step (localStorage em criação, backend em edição)
2. ✅ Steps ficam "verdinho" quando completados
3. ✅ Filtragem de steps por modalidade (STEP_MODALITY_MAPPING)
4. ✅ Navegação entre steps relevantes
5. ✅ Progresso geral do wizard
6. ✅ Separação de campos por modalidade no Step 02 (Localização)

---

## 🎯 Estratégia de Implementação

1. **Backup criado** ✅
2. Fazer uma correção por vez
3. Testar cada correção isoladamente
4. Manter funcionalidades existentes intactas
5. Documentar mudanças neste arquivo

---

## 📝 Notas Importantes

- **Cuidado com:** `STEP_MODALITY_MAPPING` - não alterar sem entender impacto
- **Cuidado com:** `handleFinish` - verificar erro de sessão
- **Cuidado com:** `formData` structure - manter compatibilidade
- **Cuidado com:** Validações obrigatórias - ajustar conforme modalidade
