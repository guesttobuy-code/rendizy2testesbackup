# 🔍 ANÁLISE - Prompt Multi-Tenant do ChatGPT

**Data:** 06/11/2025  
**Status:** ⚠️ Código para Next.js, projeto usa React + Vite

---

## 🎯 OBJETIVO DO PROMPT

Gerar sistema completo multi-tenant com:
- ✅ Carregamento de organização
- ✅ Hooks customizados
- ✅ Rotas protegidas
- ✅ Seed automático
- ✅ Troca de organização
- ✅ Realtime watcher
- ✅ Row Level Security

---

## ❌ INCOMPATIBILIDADES

### **1. Framework:**
- **ChatGPT:** Next.js (App Router, Server Components, RSC)
- **Projeto:** React + Vite (Client-side, React Router)

### **2. Estrutura de Pastas:**
- **ChatGPT:** `/app`, `/libs`, `/database` (Next.js 13+)
- **Projeto:** `/src`, `/supabase` (Vite padrão)

### **3. Middleware:**
- **ChatGPT:** `middleware.ts` (Next.js Edge Runtime)
- **Projeto:** `ProtectedRoute.tsx` (React Component)

### **4. Server Components:**
- **ChatGPT:** Server Components + RSC
- **Projeto:** Client Components apenas

---

## ✅ O QUE PODE SER ADAPTADO

### **1. Lógica de Negócio:**
- ✅ Carregamento de organização
- ✅ Hooks customizados (`useOrganization`)
- ✅ Rotas protegidas (já existe `ProtectedRoute`)
- ✅ Seed automático (trigger/Edge Function)
- ✅ Troca de organização
- ✅ Realtime watcher (Supabase Realtime)
- ✅ RLS (Row Level Security)

### **2. Estrutura de Código:**
- ✅ Separação de responsabilidades
- ✅ Tipos TypeScript
- ✅ Serviços organizados

---

## 🛠️ ADAPTAÇÃO PARA REACT + VITE

### **Estrutura de Pastas Adaptada:**

```
/src
 ├─ components/
 │   ├─ ProtectedRoute.tsx      ← já existe (melhorado)
 │   ├─ OnboardingPage.tsx      ← criar
 │   └─ OrgSwitcher.tsx         ← criar
 │
 ├─ contexts/
 │   ├─ AuthContext.tsx         ← já existe
 │   └─ OrganizationContext.tsx ← criar
 │
 ├─ hooks/
 │   ├─ useAuth.ts              ← já existe (via AuthContext)
 │   ├─ useOrganization.ts      ← criar
 │   └─ useRealtimeOrg.ts       ← criar
 │
 ├─ lib/
 │   ├─ supabase/
 │   │   ├─ client.ts           ← criar
 │   │   └─ server.ts           ← criar (para Edge Functions)
 │   │
 │   ├─ auth/
 │   │   └─ getUser.ts          ← criar
 │   │
 │   └─ org/
 │       ├─ getCurrentOrganization.ts  ← criar
 │       ├─ switchOrganization.ts      ← criar
 │       └─ createOrganization.ts      ← criar
 │
 ├─ types/
 │   ├─ auth.ts                 ← criar
 │   ├─ organization.ts         ← criar
 │   └─ db.ts                   ← criar
 │
 └─ utils/
     └─ rls.ts                  ← criar (helpers RLS)
```

---

## 📋 IMPLEMENTAÇÃO ADAPTADA

### **1. Hook `useOrganization`**

```typescript
// src/hooks/useOrganization.ts
import { useContext } from 'react';
import { OrganizationContext } from '../contexts/OrganizationContext';

export function useOrganization() {
  const context = useContext(OrganizationContext);
  
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider');
  }
  
  return context;
}
```

---

### **2. Context de Organização**

```typescript
// src/contexts/OrganizationContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getCurrentOrganization, switchOrganization } from '../lib/org/getCurrentOrganization';
import { Organization } from '../types/organization';

interface OrganizationContextType {
  organization: Organization | null;
  isLoading: boolean;
  error: string | null;
  switchOrg: (orgId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrganization = async () => {
    if (!isAuthenticated || !user) {
      setOrganization(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const org = await getCurrentOrganization(user.id);
      setOrganization(org);
    } catch (err) {
      console.error('Error loading organization:', err);
      setError(err instanceof Error ? err.message : 'Failed to load organization');
      setOrganization(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchOrg = async (orgId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await switchOrganization(orgId);
      await loadOrganization();
    } catch (err) {
      console.error('Error switching organization:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch organization');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrganization();
  }, [isAuthenticated, user?.id]);

  return (
    <OrganizationContext.Provider
      value={{
        organization,
        isLoading,
        error,
        switchOrg: handleSwitchOrg,
        refresh: loadOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}
```

---

### **3. Serviço de Organização**

```typescript
// src/lib/org/getCurrentOrganization.ts
import { createClient } from '@jsr/supabase__supabase-js@2';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { Organization } from '../../types/organization';

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

export async function getCurrentOrganization(userId: string): Promise<Organization | null> {
  try {
    // Buscar usuário com organização
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (userError || !user?.organization_id) {
      return null;
    }

    // Buscar organização
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', user.organization_id)
      .single();

    if (orgError || !org) {
      return null;
    }

    return org as Organization;
  } catch (error) {
    console.error('Error getting current organization:', error);
    throw error;
  }
}

export async function switchOrganization(orgId: string): Promise<void> {
  try {
    const token = localStorage.getItem('rendizy-token');
    if (!token) {
      throw new Error('Not authenticated');
    }

    const { projectId } = await import('../../utils/supabase/info');
    const url = `https://${projectId}.supabase.co/functions/v1/rendizy-server/auth/switch-org`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ organizationId: orgId })
    });

    if (!response.ok) {
      throw new Error('Failed to switch organization');
    }

    const result = await response.json();
    
    if (result.success && result.organization) {
      // Atualizar localStorage
      localStorage.setItem('rendizy-organization', JSON.stringify(result.organization));
    }
  } catch (error) {
    console.error('Error switching organization:', error);
    throw error;
  }
}
```

---

### **4. Hook Realtime**

```typescript
// src/hooks/useRealtimeOrg.ts
import { useEffect, useState } from 'react';
import { createClient } from '@jsr/supabase__supabase-js@2';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Organization } from '../types/organization';

export function useRealtimeOrg(orgId: string | null) {
  const [organization, setOrganization] = useState<Organization | null>(null);

  useEffect(() => {
    if (!orgId) return;

    const supabase = createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey
    );

    // Subscribe to organization changes
    const channel = supabase
      .channel(`org:${orgId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'organizations',
          filter: `id=eq.${orgId}`
        },
        (payload) => {
          console.log('Organization changed:', payload);
          if (payload.eventType === 'UPDATE' && payload.new) {
            setOrganization(payload.new as Organization);
          } else if (payload.eventType === 'DELETE') {
            setOrganization(null);
          }
        }
      )
      .subscribe();

    // Load initial data
    supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setOrganization(data as Organization);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId]);

  return organization;
}
```

---

### **5. Componente OrgSwitcher**

```typescript
// src/components/OrgSwitcher.tsx
import { useState, useEffect } from 'react';
import { useOrganization } from '../hooks/useOrganization';
import { createClient } from '@jsr/supabase__supabase-js@2';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { Organization } from '../types/organization';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function OrgSwitcher() {
  const { organization, switchOrg, isLoading } = useOrganization();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const supabase = createClient(
        `https://${projectId}.supabase.co`,
        publicAnonKey
      );

      // Buscar organizações do usuário
      // (assumindo que há uma tabela de membros ou similar)
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .order('name');

      if (error) throw error;
      setOrganizations(data as Organization[] || []);
    } catch (error) {
      console.error('Error loading organizations:', error);
      toast.error('Erro ao carregar organizações');
    } finally {
      setLoadingOrgs(false);
    }
  };

  const handleSwitch = async (orgId: string) => {
    if (orgId === organization?.id) return;

    try {
      await switchOrg(orgId);
      toast.success('Organização alterada com sucesso');
    } catch (error) {
      console.error('Error switching organization:', error);
      toast.error('Erro ao trocar organização');
    }
  };

  if (loadingOrgs || isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4" />
      <Select
        value={organization?.id || ''}
        onValueChange={handleSwitch}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Selecione organização" />
        </SelectTrigger>
        <SelectContent>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

---

## 📊 COMPARAÇÃO: NEXT.JS vs REACT + VITE

| Funcionalidade | Next.js (ChatGPT) | React + Vite (Adaptado) |
|----------------|-------------------|-------------------------|
| **Middleware** | `middleware.ts` (Edge) | `ProtectedRoute.tsx` (Component) |
| **Hooks** | `useOrganization()` | `useOrganization()` ✅ |
| **Context** | Server Context | React Context ✅ |
| **Realtime** | Server Action | Supabase Realtime ✅ |
| **RLS** | Server-side | Client + Backend ✅ |
| **Seed** | Trigger SQL | Trigger SQL ✅ |
| **Org Switch** | Server Action | API Call ✅ |

---

## 🚀 CHECKLIST DE IMPLEMENTAÇÃO

### **Fase 1: Infraestrutura**
- [ ] Criar `OrganizationContext.tsx`
- [ ] Criar `useOrganization.ts` hook
- [ ] Criar `getCurrentOrganization.ts` service
- [ ] Criar `switchOrganization.ts` service

### **Fase 2: Componentes**
- [ ] Criar `OrgSwitcher.tsx`
- [ ] Criar `OnboardingPage.tsx`
- [ ] Atualizar `ProtectedRoute.tsx` (já feito)

### **Fase 3: Realtime**
- [ ] Criar `useRealtimeOrg.ts` hook
- [ ] Integrar no `OrganizationContext`

### **Fase 4: Backend**
- [ ] Criar rota `/auth/switch-org`
- [ ] Implementar RLS policies
- [ ] Criar trigger/Edge Function para seed

### **Fase 5: Integração**
- [ ] Integrar `OrganizationProvider` no `App.tsx`
- [ ] Testar fluxo completo
- [ ] Documentar

---

## ⚠️ PONTOS DE ATENÇÃO

### **1. RLS (Row Level Security)**

O RLS deve ser configurado no **backend/Supabase**, não no frontend:

```sql
-- Exemplo: Policy para organizations
CREATE POLICY "Users can view their organization"
ON organizations FOR SELECT
USING (
  id IN (
    SELECT organization_id 
    FROM users 
    WHERE id = auth.uid()
  )
);
```

### **2. Realtime**

Realtime funciona no cliente, mas precisa de:
- ✅ RLS habilitado
- ✅ Subscription configurada
- ✅ Permissões corretas

### **3. Seed Automático**

Usar **Edge Function + Webhook** (mais confiável que trigger):

```typescript
// supabase/functions/handle-signup/index.ts
// (já documentado em ANALISE_TRIGGER_SIGNUP.md)
```

---

## 📝 RESUMO

### **O que funciona:**
- ✅ Lógica de negócio (adaptável)
- ✅ Hooks e Context (React padrão)
- ✅ Realtime (Supabase)
- ✅ RLS (Supabase)

### **O que precisa adaptar:**
- ❌ Next.js → React Router
- ❌ Server Components → Client Components
- ❌ Middleware Edge → ProtectedRoute Component
- ❌ Server Actions → API Calls

---

**Status:** ⚠️ Precisa adaptação completa  
**Complexidade:** Média  
**Tempo Estimado:** 1-2 semanas

