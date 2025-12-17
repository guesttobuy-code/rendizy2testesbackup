# 📋 PLANO DE CORREÇÃO: Sistema de Rascunhos

**Data:** 02/12/2025  
**Status:** 🚀 Em execução

---

## 🎯 OBJETIVO

Corrigir definitivamente o sistema de criação de rascunhos, garantindo que:

1. Rascunhos sejam criados sem validações rígidas
2. Backend detecte corretamente rascunhos e use `createDraftPropertyMinimal`
3. Frontend envie dados mínimos válidos
4. Rascunhos apareçam na lista após criação

---

## 🔍 DIAGNÓSTICO IDENTIFICADO

### **Problema Principal:**

O backend **NÃO está entrando** no fluxo `createDraftPropertyMinimal`, mesmo quando:

- `status: "draft"` está sendo enviado
- `id` não está presente
- `willCreateMinimal` deveria ser `true`

### **Evidências:**

1. Erro 400: "Max guests must be at least 1" → Validação rodando antes de criar rascunho
2. Erro 400: "Base price must be greater than 0" → Validação rodando antes de criar rascunho
3. Logs mostram que `createDraftPropertyMinimal` não está sendo chamado

### **Causa Raiz (Hipótese):**

As validações podem estar rodando **ANTES** da verificação de rascunho, ou a verificação de rascunho não está funcionando corretamente.

---

## 📝 PLANO DE EXECUÇÃO

### **FASE 1: Diagnóstico Backend** ✅ EM PROGRESSO

**Objetivo:** Entender por que `createDraftPropertyMinimal` não está sendo chamado

**Atividades:**

1. ✅ Verificar código do backend (`routes-properties.ts`)
2. ✅ Identificar onde validações de `maxGuests` e `basePrice` estão rodando
3. ⏳ Verificar se há validações no banco de dados (constraints)
4. ⏳ Adicionar logs detalhados para rastrear o fluxo

**Resultado Esperado:**

- Identificar exatamente onde as validações estão bloqueando
- Entender se o problema é na detecção de rascunho ou nas validações

---

### **FASE 2: Correção Backend** ⏳ PENDENTE

**Objetivo:** Garantir que rascunhos sejam criados sem validações rígidas

**Atividades:**

1. ⏳ Mover validações de `maxGuests` e `basePrice` para DEPOIS da verificação de rascunho
2. ⏳ Garantir que `createDraftPropertyMinimal` seja chamado ANTES de qualquer validação
3. ⏳ Adicionar valores padrão seguros em `createDraftPropertyMinimal`:
   - `max_guests: 1` (já existe)
   - `pricing_base_price: 0` (já existe, mas pode estar sendo validado)
4. ⏳ Verificar constraints do banco de dados (se houver)

**Resultado Esperado:**

- Backend cria rascunhos sem validar `maxGuests` e `basePrice`
- `createDraftPropertyMinimal` sempre é chamado para rascunhos sem ID

---

### **FASE 3: Workaround Frontend (Defensivo)** ⏳ PENDENTE

**Objetivo:** Garantir que frontend sempre envie dados válidos, mesmo se backend falhar

**Atividades:**

1. ⏳ Adicionar valores padrão seguros no `minimalDraft`:
   - `maxGuests: 1` (se não existir)
   - `basePrice: 1` (se não existir, mínimo para passar validação)
   - `currency: "BRL"` (se não existir)
2. ⏳ Garantir que `type` nunca seja `null` ou `undefined`
3. ⏳ Garantir que `name` e `code` sempre existam
4. ⏳ Remover completamente duplicação de `wizardData`

**Resultado Esperado:**

- Frontend sempre envia payload válido
- Mesmo se backend tiver problema, rascunho é criado

---

### **FASE 4: Teste End-to-End** ⏳ PENDENTE

**Objetivo:** Validar que o fluxo completo funciona

**Cenários de Teste:**

1. ⏳ Criar rascunho com apenas título (step 07)
2. ⏳ Verificar se rascunho aparece na lista
3. ⏳ Editar rascunho existente
4. ⏳ Criar rascunho sem preencher nenhum campo (apenas abrir wizard)
5. ⏳ Verificar logs do backend para confirmar `createDraftPropertyMinimal` sendo chamado

**Resultado Esperado:**

- Todos os cenários passam
- Rascunhos aparecem na lista
- Logs confirmam fluxo correto

---

### **FASE 5: Validação e Ajustes Finais** ⏳ PENDENTE

**Objetivo:** Garantir que tudo está funcionando perfeitamente

**Atividades:**

1. ⏳ Verificar se rascunhos aparecem na lista com progresso correto
2. ⏳ Verificar se dados são salvos corretamente no banco
3. ⏳ Verificar se atualizações de rascunho funcionam (PUT)
4. ⏳ Limpar logs de debug excessivos (se necessário)

**Resultado Esperado:**

- Sistema funcionando 100%
- Sem erros nos logs
- Rascunhos persistindo corretamente

---

### **FASE 6: Deploy e Documentação** ⏳ PENDENTE

**Objetivo:** Finalizar e documentar

**Atividades:**

1. ⏳ Deploy do backend (Supabase Edge Functions)
2. ⏳ Deploy do frontend (GitHub)
3. ⏳ Atualizar documentação com correções aplicadas
4. ⏳ Criar resumo das mudanças

**Resultado Esperado:**

- Código em produção
- Documentação atualizada
- Problema resolvido definitivamente

---

## 🎯 DECISÃO TOMADA

**Estratégia:** Correção em duas camadas (defensiva)

1. **Backend (Ideal):** Corrigir validações para não bloquear rascunhos
2. **Frontend (Defensivo):** Enviar valores padrão seguros como fallback

**Por quê:**

- Backend corrigido = solução ideal e limpa
- Frontend defensivo = garante funcionamento mesmo se backend tiver problema
- Dupla proteção = sistema mais robusto

---

## 📊 PROGRESSO

- [x] FASE 1: Diagnóstico Backend
- [ ] FASE 2: Correção Backend
- [ ] FASE 3: Workaround Frontend
- [ ] FASE 4: Teste End-to-End
- [ ] FASE 5: Validação e Ajustes Finais
- [ ] FASE 6: Deploy e Documentação

---

**Próximo passo:** Executar FASE 2 - Correção Backend
