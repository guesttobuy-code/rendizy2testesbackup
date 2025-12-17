# 📋 PLANO DE AÇÃO: Estrutura Sustentável para SaaS de Imóveis

**Data:** 23/11/2025  
**Status:** 🟡 Aguardando Aprovação

---

## 🎯 OBJETIVO

Corrigir problemas estruturais que impedem a criação de propriedades e implementar uma arquitetura sustentável baseada em melhores práticas para SaaS multi-tenant.

---

## 🔴 PROBLEMAS IDENTIFICADOS

### 1. UUIDs com Prefixos
- **Problema:** Sistema gera `acc_UUID`, mas SQL espera UUID puro
- **Impacto:** Erro `invalid input syntax for type uuid`
- **Solução:** Remover prefixos completamente, usar UUID puro

### 2. organization_id NOT NULL
- **Problema:** Superadmin não tem organização, mas tabela exige
- **Impacto:** Workaround frágil (usar organização aleatória)
- **Solução:** Tornar `organization_id` NULLABLE

### 3. Campos Faltando no Schema
- **Problema:** Wizard envia dados que não existem no SQL
- **Impacto:** Dados perdidos, funcionalidades quebradas
- **Solução:** Adicionar campos JSONB para dados complexos

### 4. Normalização Dupla
- **Problema:** Frontend e backend fazem normalização diferente
- **Impacto:** Complexidade, bugs, manutenção difícil
- **Solução:** Backend único faz toda normalização

---

## ✅ SOLUÇÃO PROPOSTA

### Estrutura Híbrida (Flat + JSONB)

```
properties
├── Campos Principais (Flat, Indexados)
│   ├── id, name, code, type, status
│   ├── organization_id (NULLABLE)
│   ├── address_* (flat para queries)
│   └── pricing_* (flat para queries)
│
└── Dados Complexos (JSONB, Flexível)
    ├── financial_info
    ├── location_features
    ├── wizard_data (compatibilidade)
    └── ... (outros campos do wizard)
```

### Vantagens

- ✅ **Performance:** Campos principais flat (queries rápidas)
- ✅ **Flexibilidade:** Dados complexos em JSONB (sem perder dados)
- ✅ **Multi-tenant:** `organization_id` NULLABLE (suporta superadmin)
- ✅ **Manutenibilidade:** Backend único faz normalização

---

## 📋 ETAPAS DE IMPLEMENTAÇÃO

### **FASE 1: Preparação (Sem Breaking Changes)** ⏱️ ~30min

1. ✅ Aplicar migration SQL
   - Tornar `organization_id` NULLABLE
   - Adicionar campos JSONB
   - Adicionar índices GIN

2. ✅ Testar criação básica
   - Verificar se não quebrou nada
   - Testar com dados mínimos

**Arquivo:** `MIGRATION_ESTRUTURA_SUSTENTAVEL_PROPERTIES.sql`

---

### **FASE 2: Normalização (Backend)** ⏱️ ~1h

1. ✅ Atualizar `propertyToSql` para mapear JSONB
   - Mapear `financialInfo` → `financial_info`
   - Mapear `locationFeatures` → `location_features`
   - Preservar `wizard_data` completo

2. ✅ Centralizar mapeamento de tipos
   - Criar `ACCOMMODATION_TYPE_MAP`
   - Converter `'casa'` → `'house'`, etc.

3. ✅ Remover normalização do frontend
   - Frontend envia dados como quiser
   - Backend faz toda normalização

**Arquivos:**
- `supabase/functions/rendizy-server/utils-property-mapper.ts`
- `supabase/functions/rendizy-server/routes-properties.ts`
- `RendizyPrincipal/pages/PropertyWizardPage.tsx`

---

### **FASE 3: Limpeza (UUIDs)** ⏱️ ~30min

1. ✅ Remover prefixos de `generatePropertyId`
   - `generatePropertyId()` retorna UUID puro
   - Remover lógica de remoção de prefixo

2. ✅ Atualizar todos os lugares que geram IDs
   - Verificar `generateLocationId`, `generateUserId`, etc.

**Arquivos:**
- `supabase/functions/rendizy-server/utils.ts`
- `supabase/functions/rendizy-server/utils-property-mapper.ts`

---

### **FASE 4: Validação** ⏱️ ~1h

1. ✅ Testar criação completa de propriedade
   - Via interface (wizard completo)
   - Via API (script Node.js)

2. ✅ Testar queries com filtros em JSONB
   - Buscar por `financial_info.monthlyRent`
   - Buscar por `location_features.hasParking`

3. ✅ Testar RLS policies
   - Superadmin vê tudo
   - Organização vê apenas seus dados

4. ✅ Testar performance
   - Queries com índices GIN
   - Queries com filtros flat

---

## 🚀 COMO APLICAR

### Passo 1: Aplicar Migration SQL

1. Abrir Supabase Dashboard → SQL Editor
2. Copiar conteúdo de `MIGRATION_ESTRUTURA_SUSTENTAVEL_PROPERTIES.sql`
3. Executar migration
4. Verificar mensagens de sucesso

### Passo 2: Atualizar Backend

1. Atualizar `utils-property-mapper.ts` para mapear JSONB
2. Atualizar `routes-properties.ts` para usar JSONB
3. Fazer deploy do backend

### Passo 3: Testar

1. Criar propriedade via interface
2. Verificar se dados são salvos corretamente
3. Verificar se queries funcionam

---

## ⚠️ RISCOS E MITIGAÇÕES

### Risco 1: Dados Existentes
- **Risco:** Propriedades existentes podem ter `organization_id` NULL
- **Mitigação:** Migration mantém dados existentes, apenas adiciona campos

### Risco 2: Performance
- **Risco:** Índices GIN podem ser lentos em grandes volumes
- **Mitigação:** Usar índices GIN apenas para busca, campos principais flat

### Risco 3: Compatibilidade
- **Risco:** Frontend pode quebrar se remover normalização
- **Mitigação:** Backend aceita ambos formatos (aninhado e flat)

---

## 📊 MÉTRICAS DE SUCESSO

- ✅ Criação de propriedade funciona 100%
- ✅ Todos os dados do wizard são salvos
- ✅ Queries com filtros em JSONB funcionam
- ✅ Superadmin pode criar propriedades sem organização
- ✅ Performance mantida (queries < 100ms)

---

## 📝 CHECKLIST FINAL

- [ ] Migration SQL aplicada
- [ ] `organization_id` é NULLABLE
- [ ] Campos JSONB adicionados
- [ ] Índices GIN criados
- [ ] `propertyToSql` atualizado
- [ ] Mapeamento de tipos centralizado
- [ ] Prefixos removidos de UUIDs
- [ ] Frontend não normaliza mais
- [ ] Testes passando
- [ ] Documentação atualizada

---

## 🎯 PRÓXIMOS PASSOS

1. **Revisar** este plano e a migration SQL
2. **Aprovar** ou sugerir mudanças
3. **Aplicar** migration SQL (Fase 1)
4. **Implementar** atualizações no backend (Fase 2-3)
5. **Validar** com testes completos (Fase 4)

---

## 📚 DOCUMENTAÇÃO RELACIONADA

- `ESTRUTURA_SUSTENTAVEL_SAAS_IMOVEIS.md` - Análise completa
- `MIGRATION_ESTRUTURA_SUSTENTAVEL_PROPERTIES.sql` - Migration SQL
- `ANALISE_ESTRUTURAL_PROPRIEDADES_SAAS.md` - Análise detalhada

---

**Status:** 🟡 Aguardando aprovação para iniciar Fase 1

