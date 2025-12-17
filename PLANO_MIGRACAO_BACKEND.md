# 🔄 PLANO DE MIGRAÇÃO - BACKEND KV STORE → SQL RELACIONAL

**Data:** 06/11/2025  
**Status:** ⚠️ Backend ainda usa KV Store, banco já migrado para SQL relacional

---

## 🎯 SITUAÇÃO ATUAL

### **Banco de Dados:**
- ✅ **35 tabelas relacionais** criadas
- ✅ Foreign keys configuradas
- ✅ Constraints e validações implementadas

### **Backend:**
- ❌ **Ainda usa `kv_store.tsx`** (KV Store)
- ❌ Todas as rotas salvam em `kv_store_67caf26a`
- ❌ Não está usando as novas tabelas relacionais

### **Problema:**
```
Backend → kv_store.tsx → kv_store_67caf26a (JSON)
                ❌
Banco → 35 tabelas relacionais (vazias ou não sincronizadas)
```

---

## 📋 ESTRATÉGIA DE MIGRAÇÃO

### **Opção 1: Migração Gradual (Recomendada)**
- Criar módulo `db.ts` que usa tabelas relacionais
- Migrar rotas uma por uma
- Manter compatibilidade durante transição

### **Opção 2: Migração Completa**
- Migrar tudo de uma vez
- Mais rápido, mas mais arriscado

**Recomendação:** Opção 1 (Gradual)

---

## 🛠️ IMPLEMENTAÇÃO

### **PASSO 1: Criar Módulo de Acesso ao Banco**

Criar arquivo `supabase/functions/rendizy-server/db.ts`:

```typescript
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";

const getSupabaseClient = () => {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? '',
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ''
  );
};

// ============================================================================
// ORGANIZATIONS
// ============================================================================

export const organizations = {
  async list() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async get(id: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(org: any) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('organizations')
      .insert(org)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: any) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// ============================================================================
// PROPERTIES
// ============================================================================

export const properties = {
  async list(organizationId?: string) {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async get(id: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(property: any) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('properties')
      .insert(property)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: any) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// ============================================================================
// RESERVATIONS
// ============================================================================

export const reservations = {
  async list(organizationId?: string, filters?: any) {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('reservations')
      .select(`
        *,
        property:properties(*),
        guest:guests(*)
      `)
      .order('check_in', { ascending: false });
    
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters?.property_id) {
      query = query.eq('property_id', filters.property_id);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async get(id: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        property:properties(*),
        guest:guests(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(reservation: any) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('reservations')
      .insert(reservation)
      .select(`
        *,
        property:properties(*),
        guest:guests(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: any) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('reservations')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        property:properties(*),
        guest:guests(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// ============================================================================
// GUESTS
// ============================================================================

export const guests = {
  async list(organizationId?: string) {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('guests')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async get(id: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(guest: any) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('guests')
      .insert(guest)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: any) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('guests')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// ============================================================================
// LOCATIONS
// ============================================================================

export const locations = {
  async list(organizationId?: string) {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('locations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async get(id: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async create(location: any) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('locations')
      .insert(location)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: any) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('locations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// ============================================================================
// BLOCKS
// ============================================================================

export const blocks = {
  async list(organizationId?: string, propertyId?: string) {
    const supabase = getSupabaseClient();
    let query = supabase
      .from('blocks')
      .select('*')
      .order('start_date', { ascending: true });
    
    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }
    
    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async create(block: any) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('blocks')
      .insert(block)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// ============================================================================
// CUSTOM PRICES
// ============================================================================

export const customPrices = {
  async list(propertyId: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('custom_prices')
      .select('*')
      .eq('property_id', propertyId)
      .order('date', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async create(price: any) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('custom_prices')
      .insert(price)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('custom_prices')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// ============================================================================
// CUSTOM MIN NIGHTS
// ============================================================================

export const customMinNights = {
  async list(propertyId: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('custom_min_nights')
      .select('*')
      .eq('property_id', propertyId)
      .order('date', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async create(minNight: any) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('custom_min_nights')
      .insert(minNight)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('custom_min_nights')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};

// ============================================================================
// CHAT
// ============================================================================

export const chat = {
  conversations: {
    async list(organizationId: string) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('chat_conversations')
        .select(`
          *,
          guest:guests(*),
          property:properties(*),
          reservation:reservations(*)
        `)
        .eq('organization_id', organizationId)
        .order('last_message_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },

    async get(id: string) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('chat_conversations')
        .select(`
          *,
          guest:guests(*),
          property:properties(*),
          reservation:reservations(*)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },

    async create(conversation: any) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert(conversation)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },

    async update(id: string, updates: any) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('chat_conversations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
  },

  messages: {
    async list(conversationId: string) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },

    async create(message: any) {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('chat_messages')
        .insert(message)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
  },
};

// Export default
export default {
  organizations,
  properties,
  reservations,
  guests,
  locations,
  blocks,
  customPrices,
  customMinNights,
  chat,
};
```

---

## 📝 EXEMPLO DE MIGRAÇÃO DE ROTA

### **ANTES (KV Store):**

```typescript
// routes-properties.ts
import * as kv from './kv_store.tsx';

export const listProperties = async (c: Context) => {
  const properties = await kv.getByPrefix('property:');
  return c.json({ success: true, data: properties });
};

export const createProperty = async (c: Context) => {
  const body = await c.req.json();
  const property = { ...body, id: `acc_${Date.now()}` };
  await kv.set(`property:${property.id}`, property);
  return c.json({ success: true, data: property });
};
```

### **DEPOIS (SQL Relacional):**

```typescript
// routes-properties.ts
import db from './db.ts';

export const listProperties = async (c: Context) => {
  const organizationId = c.req.query('organization_id');
  const properties = await db.properties.list(organizationId);
  return c.json({ success: true, data: properties });
};

export const createProperty = async (c: Context) => {
  const body = await c.req.json();
  const property = await db.properties.create(body);
  return c.json({ success: true, data: property });
};
```

---

## 📊 CHECKLIST DE MIGRAÇÃO

### **Fase 1: Infraestrutura**
- [ ] Criar `db.ts` com funções básicas
- [ ] Testar conexão com Supabase
- [ ] Criar helpers para mapeamento de dados

### **Fase 2: Rotas Core**
- [ ] Migrar `routes-organizations.ts`
- [ ] Migrar `routes-users.ts`
- [ ] Migrar `routes-properties.ts`
- [ ] Migrar `routes-locations.ts`

### **Fase 3: Rotas de Negócio**
- [ ] Migrar `routes-reservations.ts`
- [ ] Migrar `routes-guests.ts`
- [ ] Migrar `routes-blocks.ts`
- [ ] Migrar `routes-calendar.ts`

### **Fase 4: Rotas Auxiliares**
- [ ] Migrar `routes-chat.ts`
- [ ] Migrar `routes-listings.ts`
- [ ] Migrar `routes-rooms.ts`
- [ ] Migrar `routes-rules.ts`
- [ ] Migrar `routes-pricing-settings.ts`

### **Fase 5: Limpeza**
- [ ] Remover dependência de `kv_store.tsx`
- [ ] Atualizar testes
- [ ] Documentar mudanças

---

## ⚠️ PONTOS DE ATENÇÃO

### **1. Mapeamento de Dados**
- KV Store usa prefixos (`property:`, `org:`, etc)
- SQL usa foreign keys
- Pode precisar transformar estrutura de dados

### **2. Arrays e JSON**
- KV Store: arrays diretos no JSON
- SQL: campos ARRAY ou JSONB
- Verificar compatibilidade

### **3. IDs**
- KV Store: IDs customizados (`acc_123`, `org_456`)
- SQL: UUIDs
- Pode precisar migrar IDs existentes

### **4. Relacionamentos**
- KV Store: IDs em strings
- SQL: Foreign keys
- Garantir integridade referencial

---

## 🚀 PRÓXIMOS PASSOS

1. **Criar `db.ts`** com funções básicas
2. **Migrar uma rota simples** (ex: organizations) como teste
3. **Testar** se funciona corretamente
4. **Migrar gradualmente** outras rotas
5. **Remover KV Store** quando tudo estiver migrado

---

**Status:** ⚠️ Aguardando Implementação  
**Prioridade:** Alta

