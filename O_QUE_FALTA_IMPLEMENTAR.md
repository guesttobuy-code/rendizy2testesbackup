# 📋 O QUE FALTA IMPLEMENTAR - Arquitetura & Escalabilidade

## ✅ O QUE JÁ ESTÁ IMPLEMENTADO

### Arquitetura de Banco de Dados:
- ✅ Tabela `organization_channel_config` com schema completo
- ✅ Índice básico em `organization_id`
- ✅ RLS habilitado (mas policy permissiva: `USING (true)`)
- ✅ Trigger para `updated_at` automático
- ✅ Repository Pattern para `channel_config` (UPSERT atômico)

### Escalabilidade:
- ✅ Connection pooling (Supabase gerencia automaticamente)
- ✅ Índices básicos nas tabelas principais
- ✅ Service Role Key para bypass de RLS em Edge Functions

---

## 🚨 O QUE FALTA - PRIORIDADE ALTA (AGORA)

### 1. **Verificar se o Repository realmente funciona**
**Status:** ✅ Implementado, ⏳ Precisa testar em produção
**Por que é crítico:** 3 dias tentando salvar credenciais - precisa funcionar AGORA
**Ação:** Testar salvamento de credenciais após deploy

### 2. **Índices Compostos Faltando**
**O que falta:**
```sql
-- ❌ FALTANDO: Índice composto para queries filtradas
CREATE INDEX idx_channel_config_org_enabled 
ON organization_channel_config(organization_id, whatsapp_enabled);

-- ❌ FALTANDO: Índice para outras tabelas (se usarem banco)
-- Properties, Reservations, Guests ainda estão no KV Store
-- MAS se migrarem para tabelas, precisam:
CREATE INDEX idx_properties_org_status 
ON properties(organization_id, status) 
WHERE deleted_at IS NULL;

CREATE INDEX idx_reservations_org_dates 
ON reservations(organization_id, check_in_date, check_out_date) 
WHERE cancelled_at IS NULL;
```
**Impacto:** Queries filtradas serão lentas em escala
**Prioridade:** Alta - necessário para escala

### 3. **Soft Deletes Faltando**
**O que falta:**
```sql
-- ❌ FALTANDO: Soft delete em organization_channel_config
ALTER TABLE organization_channel_config 
ADD COLUMN deleted_at TIMESTAMPTZ;

-- ❌ FALTANDO: Soft delete em outras tabelas (se migrarem)
ALTER TABLE properties ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN cancelled_at TIMESTAMPTZ;
ALTER TABLE guests ADD COLUMN deleted_at TIMESTAMPTZ;
```
**Impacto:** Sem auditoria, sem recovery, dados deletados perdidos para sempre
**Prioridade:** Alta - essencial para produção

---

## ⚠️ O QUE FALTA - PRIORIDADE MÉDIA (CURTO PRAZO)

### 4. **Cursor-Based Pagination**
**Situação atual:**
- ❌ Usando OFFSET-based pagination (`LIMIT/OFFSET`)
- ❌ Ineficiente para grandes volumes

**O que falta:**
```typescript
// ❌ ATUAL: Offset-based (lento em escala)
const { data } = await client
  .from('properties')
  .select('*')
  .eq('organization_id', orgId)
  .range(offset, offset + limit);

// ✅ PRECISA: Cursor-based (eficiente)
const { data } = await client
  .from('properties')
  .select('*')
  .eq('organization_id', orgId)
  .gt('id', cursor)
  .order('id', { ascending: true })
  .limit(limit + 1); // +1 para verificar hasMore
```
**Impacto:** Queries paginadas ficam lentas após 10k+ registros
**Prioridade:** Média - necessário quando atingir escala

### 5. **RLS Policies Otimizadas**
**Situação atual:**
```sql
-- ❌ ATUAL: Policy permissiva (qualquer um pode acessar)
CREATE POLICY "Allow all operations on channel_config" 
ON organization_channel_config 
FOR ALL 
USING (true)  -- ❌ PROBLEMA: Não filtra por tenant!
WITH CHECK (true);
```

**O que falta:**
```sql
-- ✅ PRECISA: Policy que filtra por organization_id
CREATE POLICY "tenant_isolation_channel_config" 
ON organization_channel_config 
FOR ALL 
USING (organization_id = current_setting('app.current_organization_id', true)::text)
WITH CHECK (organization_id = current_setting('app.current_organization_id', true)::text);
```
**Impacto:** Qualquer organização pode ver/modificar dados de outras
**Prioridade:** ALTA - Segurança crítica!

### 6. **Select Apenas Campos Necessários**
**Situação atual:**
- ❌ Muitos lugares usando `SELECT *`

**O que falta:**
```typescript
// ❌ ATUAL: Seleciona tudo
.select('*')

// ✅ PRECISA: Selecionar apenas campos necessários
.select('id, name, status, created_at')
```
**Impacto:** Transferência de dados desnecessária, queries mais lentas
**Prioridade:** Média - otimização de performance

---

## 🚀 O QUE FALTA - PRIORIDADE BAIXA (LONGO PRAZO)

### 7. **Cache Estratégico**
**O que falta:**
- ❌ Sem cache em memória
- ❌ Sem Redis para cache distribuído

**Implementar:**
```typescript
// Cache em memória (MVP)
class CachedRepository {
  private cache = new Map<string, { data: any; expires: number }>();
  
  async findByOrganizationId(orgId: string) {
    // Verificar cache primeiro
    const cached = this.cache.get(orgId);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    
    // Buscar do banco
    const data = await super.findByOrganizationId(orgId);
    
    // Armazenar no cache (TTL 5 min)
    this.cache.set(orgId, {
      data,
      expires: Date.now() + 5 * 60 * 1000
    });
    
    return data;
  }
}
```
**Impacto:** Queries repetidas são lentas
**Prioridade:** Baixa - necessário quando tiver muito tráfego

### 8. **Database Partitioning**
**O que falta:**
- ❌ Tabelas grandes não particionadas

**Implementar quando necessário:**
```sql
-- Para reservations (quando tiver milhões)
CREATE TABLE reservations_2024 PARTITION OF reservations
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE reservations_2025 PARTITION OF reservations
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```
**Impacto:** Queries em tabelas grandes ficam lentas
**Prioridade:** Baixa - necessário apenas com 1M+ registros

### 9. **Read Replicas**
**O que falta:**
- ❌ Sem read replicas para queries complexas

**Implementar quando necessário:**
- Configurar read replicas no Supabase
- Usar replicas para queries de relatório/analytics
- Manter primary para writes

**Impacto:** Queries pesadas bloqueiam writes
**Prioridade:** Baixa - necessário apenas com muito tráfego simultâneo

### 10. **Event-Driven Architecture**
**O que falta:**
- ❌ Operações síncronas bloqueando resposta

**Implementar:**
- Eventos assíncronos para operações pesadas
- Fila de mensagens (ex: Bull, BullMQ)
- Workers para processar eventos

**Impacto:** Operações pesadas tornam API lenta
**Prioridade:** Baixa - necessário apenas quando crescer muito

---

## 🎯 PRIORIZAÇÃO PRÁTICA

### **FASE 1: AGORA (Hoje)**
1. ✅ **Repository Pattern** - JÁ IMPLEMENTADO
2. ⏳ **Testar salvamento** - PRECISA TESTAR AGORA
3. 🔴 **RLS Policies** - CRÍTICO PARA SEGURANÇA

### **FASE 2: ESTA SEMANA**
4. 📊 **Índices Compostos** - Essencial para performance
5. 🗑️ **Soft Deletes** - Essencial para produção
6. 📄 **Select Apenas Campos Necessários** - Otimização rápida

### **FASE 3: ESTE MÊS**
7. 🔄 **Cursor-Based Pagination** - Necessário para escala
8. 💾 **Cache em Memória** - Melhora experiência

### **FASE 4: FUTURO (Quando Crescer)**
9. 🔀 **Database Partitioning** - Apenas se necessário
10. 📡 **Read Replicas** - Apenas se necessário
11. ⚡ **Event-Driven** - Apenas se necessário

---

## 📊 RESUMO EXECUTIVO

### **Para o Básico Funcionar AGORA:**
- ✅ Repository Pattern - **IMPLEMENTADO**
- ⏳ Testar salvamento - **PRECISA TESTAR**
- 🔴 RLS Policies - **CRÍTICO - FALTA IMPLEMENTAR**

### **Para Escalar:**
- 📊 Índices Compostos - **FALTA IMPLEMENTAR**
- 🗑️ Soft Deletes - **FALTA IMPLEMENTAR**
- 🔄 Cursor Pagination - **FALTA IMPLEMENTAR**
- 💾 Cache - **FALTA IMPLEMENTAR**

### **Para Escalar MUITO:**
- 🔀 Partitioning - **NÃO URGENTE**
- 📡 Read Replicas - **NÃO URGENTE**
- ⚡ Event-Driven - **NÃO URGENTE**

---

## 🚨 AÇÃO IMEDIATA

**O que fazer AGORA para garantir que funcione:**

1. ✅ **Testar Repository** (aguardando deploy)
2. 🔴 **Implementar RLS Policies corretas** (CRÍTICO)
3. 📊 **Adicionar índices compostos** (ESSENCIAL)

Quer que eu implemente os itens críticos (RLS + Índices) AGORA?

