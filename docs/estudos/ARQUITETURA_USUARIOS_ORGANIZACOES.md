# Arquitetura de Usuários e Organizações - Rendizy

**Data:** 02/02/2026
**Status:** Proposta para Implementação

---

## 1. Visão Geral do Sistema

### 1.1 Hierarquia de Usuários

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PLATAFORMA RENDIZY                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐                                                   │
│  │   SUPER ADMIN    │  ← Admin Master (você)                            │
│  │   (type=superadmin)│  ← Pode criar Organizations                      │
│  │   org_id = NULL  │  ← Acesso total à plataforma                       │
│  └────────┬─────────┘                                                   │
│           │                                                              │
│           │ cria                                                         │
│           ▼                                                              │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    ORGANIZATIONS (Imobiliárias)                    │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │                                                                    │   │
│  │  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐       │   │
│  │  │ MedHome       │   │ Sua Casa      │   │ Rendizy HQ    │       │   │
│  │  │ (Enterprise)  │   │ (Enterprise)  │   │ (Enterprise)  │       │   │
│  │  └───────┬───────┘   └───────┬───────┘   └───────┬───────┘       │   │
│  │          │                   │                   │                │   │
│  │          ▼                   ▼                   ▼                │   │
│  │  ┌─────────────────────────────────────────────────────────┐     │   │
│  │  │                    USERS (Staff)                         │     │   │
│  │  ├─────────────────────────────────────────────────────────┤     │   │
│  │  │  OWNER    → Dono da imobiliária, pode tudo na org       │     │   │
│  │  │  ADMIN    → Administrador, quase tudo                   │     │   │
│  │  │  MANAGER  → Gerente, gestão operacional                 │     │   │
│  │  │  STAFF    → Corretor/Agente, operações básicas          │     │   │
│  │  │  READONLY → Visualização apenas                          │     │   │
│  │  └─────────────────────────────────────────────────────────┘     │   │
│  │                                                                    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Fluxos de Criação de Conta

### 2.1 Fluxo 1: Admin Master Cria Organização (Atual)

```
┌─────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ Admin Master│──1──▶│ Criar Organization│──2──▶│ Criar User Owner │
│             │      │ (via Admin Panel) │      │ (dono da org)   │
└─────────────┘      └─────────────────┘      └────────┬────────┘
                                                        │
                                              3 │ email de boas-vindas
                                                ▼
                                        ┌─────────────────┐
                                        │ Owner acessa e  │
                                        │ pode criar staff│
                                        └─────────────────┘
```

### 2.2 Fluxo 2: Self-Signup (Novo - Captação de Leads)

```
┌─────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ Visitante   │──1──▶│ Landing Page    │──2──▶│ Formulário de   │
│ (Lead)      │      │ rendizy.com     │      │ Cadastro        │
└─────────────┘      └─────────────────┘      └────────┬────────┘
                                                        │
                                              3 │ cria automaticamente
                                                ▼
                                        ┌─────────────────────────┐
                                        │ Organization (plano=free)│
                                        │ User (role=owner)       │
                                        │ Status: trial           │
                                        │ Trial: 14 dias          │
                                        └───────────┬─────────────┘
                                                    │
                                          4 │ email de ativação
                                            ▼
                                        ┌─────────────────┐
                                        │ Owner ativa e   │
                                        │ começa trial    │
                                        └────────┬────────┘
                                                 │
                                       5 │ trial expira
                                         ▼
                                    ┌──────────────┐
                                    │ Escolher:    │
                                    │ • Assinar    │
                                    │ • Funcões    │
                                    │   limitadas  │
                                    └──────────────┘
```

---

## 3. Estrutura do Banco de Dados

### 3.1 Tabela `users` (já existe, precisa de ajustes)

```sql
-- Adicionar coluna 'role' para granularidade dentro da org
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT 
  DEFAULT 'staff' 
  CHECK (role IN ('owner', 'admin', 'manager', 'staff', 'readonly'));

-- Adicionar flag para indicar se email foi verificado
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Adicionar token de verificação
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ;

-- Adicionar invited_by (quem convidou este usuário)
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id);
```

### 3.2 Tabela `organizations` (já existe, precisa de ajustes)

```sql
-- Adicionar campos para trial e billing
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS 
  subscription_status TEXT DEFAULT 'trial' 
  CHECK (subscription_status IN ('trial', 'active', 'past_due', 'cancelled', 'free'));

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Adicionar limites por plano
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS limits_users INT DEFAULT 2;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS limits_properties INT DEFAULT 5;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS limits_reservations INT DEFAULT -1; -- -1 = ilimitado
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS limits_storage_mb INT DEFAULT 500;

-- Flag para self-signup vs criado pelo admin
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS signup_source TEXT DEFAULT 'admin'
  CHECK (signup_source IN ('admin', 'self_signup', 'referral', 'api'));
```

### 3.3 Nova Tabela `plans` (configuração de planos)

```sql
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY, -- 'free', 'starter', 'professional', 'enterprise'
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) DEFAULT 0,
  price_yearly DECIMAL(10,2) DEFAULT 0,
  
  -- Limites
  max_users INT DEFAULT 2,
  max_properties INT DEFAULT 5,
  max_reservations_per_month INT DEFAULT -1,
  max_storage_mb INT DEFAULT 500,
  
  -- Features (flags)
  features JSONB DEFAULT '{}',
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir planos padrão
INSERT INTO plans (id, name, price_monthly, max_users, max_properties, max_storage_mb, features) VALUES
  ('free', 'Grátis', 0, 1, 3, 100, '{"chat": false, "reports": false, "api": false}'),
  ('starter', 'Starter', 97, 3, 10, 1000, '{"chat": true, "reports": "basic", "api": false}'),
  ('professional', 'Professional', 197, 10, 50, 5000, '{"chat": true, "reports": "advanced", "api": true}'),
  ('enterprise', 'Enterprise', 0, -1, -1, -1, '{"chat": true, "reports": "advanced", "api": true, "custom": true}')
ON CONFLICT (id) DO NOTHING;
```

---

## 4. Sistema de Permissões

### 4.1 Mapeamento de Permissões por Role

```typescript
const ROLE_PERMISSIONS = {
  // OWNER: Dono da imobiliária - pode tudo na sua org
  owner: {
    canManageUsers: true,      // Criar/editar/remover staff
    canManageBilling: true,    // Alterar plano, pagamentos
    canManageSettings: true,   // Configurações da org
    canManageProperties: true, // CRUD de imóveis
    canManageReservations: true,
    canViewReports: true,
    canExportData: true,
    canDeleteOrganization: true, // Apenas owner pode deletar
  },
  
  // ADMIN: Administrador - quase tudo, exceto billing e deletar org
  admin: {
    canManageUsers: true,
    canManageBilling: false,    // ❌ Não pode
    canManageSettings: true,
    canManageProperties: true,
    canManageReservations: true,
    canViewReports: true,
    canExportData: true,
    canDeleteOrganization: false, // ❌ Não pode
  },
  
  // MANAGER: Gerente - gestão operacional
  manager: {
    canManageUsers: false,      // ❌ Não pode criar usuários
    canManageBilling: false,
    canManageSettings: false,
    canManageProperties: true,   // ✅ Pode gerenciar imóveis
    canManageReservations: true,
    canViewReports: true,
    canExportData: true,
    canDeleteOrganization: false,
  },
  
  // STAFF: Corretor/Agente - operações do dia-a-dia
  staff: {
    canManageUsers: false,
    canManageBilling: false,
    canManageSettings: false,
    canManageProperties: false,  // ❌ Apenas visualizar
    canManageReservations: true, // ✅ Pode criar/editar reservas
    canViewReports: false,
    canExportData: false,
    canDeleteOrganization: false,
  },
  
  // READONLY: Apenas visualização
  readonly: {
    canManageUsers: false,
    canManageBilling: false,
    canManageSettings: false,
    canManageProperties: false,
    canManageReservations: false,
    canViewReports: true,        // ✅ Pode ver relatórios
    canExportData: false,
    canDeleteOrganization: false,
  },
};
```

### 4.2 Verificação de Permissões no Backend

```typescript
// utils-permissions.ts
export function canManageUsers(c: Context): boolean {
  const tenant = getTenant(c);
  
  // SuperAdmin pode tudo
  if (tenant.type === 'superadmin') return true;
  
  // Dentro de uma org, verificar role
  const user = getCurrentUser(c);
  return ['owner', 'admin'].includes(user.role);
}

export function canManageOrgSettings(c: Context): boolean {
  const tenant = getTenant(c);
  if (tenant.type === 'superadmin') return true;
  
  const user = getCurrentUser(c);
  return ['owner', 'admin'].includes(user.role);
}
```

---

## 5. Planos e Limites

### 5.1 Tabela de Planos

| Plano | Preço/mês | Usuários | Imóveis | Storage | Features |
|-------|-----------|----------|---------|---------|----------|
| **Free** | R$ 0 | 1 | 3 | 100MB | Básico |
| **Starter** | R$ 97 | 3 | 10 | 1GB | Chat, Reports básico |
| **Professional** | R$ 197 | 10 | 50 | 5GB | Tudo + API |
| **Enterprise** | Sob consulta | ∞ | ∞ | ∞ | Customizado |

### 5.2 Período de Trial

- **Duração:** 14 dias
- **Plano durante trial:** Professional (para mostrar valor)
- **Ao expirar:** Downgrade automático para Free com limites
- **Dados:** Mantidos, mas features bloqueadas

### 5.3 Verificação de Limites

```typescript
// utils-limits.ts
export async function checkOrganizationLimits(
  orgId: string, 
  action: 'add_user' | 'add_property' | 'add_reservation'
): Promise<{ allowed: boolean; reason?: string }> {
  const org = await getOrganization(orgId);
  const plan = await getPlan(org.plan);
  
  switch (action) {
    case 'add_user':
      const currentUsers = await countUsersInOrg(orgId);
      if (plan.max_users !== -1 && currentUsers >= plan.max_users) {
        return { 
          allowed: false, 
          reason: `Limite de ${plan.max_users} usuários atingido. Faça upgrade do plano.` 
        };
      }
      break;
      
    case 'add_property':
      const currentProps = await countPropertiesInOrg(orgId);
      if (plan.max_properties !== -1 && currentProps >= plan.max_properties) {
        return { 
          allowed: false, 
          reason: `Limite de ${plan.max_properties} imóveis atingido. Faça upgrade do plano.` 
        };
      }
      break;
  }
  
  return { allowed: true };
}
```

---

## 6. API Endpoints

### 6.1 Endpoints Públicos (Self-Signup)

```
POST /auth/signup
  → Cria conta + organization (trial)
  → Envia email de verificação
  → Não precisa de autenticação

POST /auth/verify-email
  → Verifica email com token
  → Ativa a conta

POST /auth/login
  → Login normal

POST /auth/forgot-password
  → Solicita reset de senha

POST /auth/reset-password
  → Reseta senha com token
```

### 6.2 Endpoints Protegidos (Autenticado)

```
# Usuários (Owner/Admin da org)
GET    /users                → Listar usuários da minha org
POST   /users                → Convidar novo usuário
PATCH  /users/:id            → Atualizar usuário
DELETE /users/:id            → Remover usuário

# Organização (Owner/Admin)
GET    /organization         → Dados da minha org
PATCH  /organization         → Atualizar dados
GET    /organization/usage   → Uso vs limites

# Billing (Owner apenas)
GET    /billing              → Status do plano
POST   /billing/checkout     → Iniciar checkout Stripe
POST   /billing/cancel       → Cancelar assinatura
GET    /billing/invoices     → Histórico de faturas
```

### 6.3 Endpoints Admin Master

```
# Organizações (SuperAdmin)
GET    /admin/organizations        → Listar todas
POST   /admin/organizations        → Criar manualmente
PATCH  /admin/organizations/:id    → Atualizar
DELETE /admin/organizations/:id    → Deletar

# Usuários (SuperAdmin)
GET    /admin/users                → Listar todos
POST   /admin/users                → Criar em qualquer org
PATCH  /admin/users/:id            → Atualizar qualquer
DELETE /admin/users/:id            → Remover qualquer

# Planos (SuperAdmin)
GET    /admin/plans                → Listar planos
PATCH  /admin/plans/:id            → Atualizar plano
```

---

## 7. Implementação Passo a Passo

### Fase 1: Ajustar Backend para Owner/Admin (1-2 dias)
- [ ] Adicionar coluna `role` na tabela users
- [ ] Criar middleware de permissões por role
- [ ] Ajustar `/users` para permitir Owner/Admin gerenciar staff da própria org
- [ ] Criar verificação de limites do plano

### Fase 2: Self-Signup básico (2-3 dias)
- [ ] Criar endpoint `POST /auth/signup`
- [ ] Criar tabela de verificação de email
- [ ] Enviar email de ativação
- [ ] Criar página de signup no frontend

### Fase 3: Planos e Limites (2-3 dias)
- [ ] Criar tabela `plans`
- [ ] Implementar verificação de limites
- [ ] UI de "Limite atingido" no frontend
- [ ] Página de comparação de planos

### Fase 4: Integração Stripe (3-5 dias)
- [ ] Configurar Stripe no projeto
- [ ] Criar checkout session
- [ ] Webhooks de pagamento
- [ ] Atualização automática de plano

### Fase 5: Trial Experience (1-2 dias)
- [ ] Countdown de trial no dashboard
- [ ] Email de trial expirando
- [ ] Downgrade automático

---

## 8. Próximos Passos Imediatos

1. **Agora:** Ajustar backend para Owner/Admin poder criar staff
2. **Depois:** Criar endpoint de self-signup
3. **Futuro:** Integrar Stripe para billing

---

## Decisões Pendentes

- [ ] Duração do trial: 7, 14 ou 30 dias?
- [ ] Plano durante trial: Free, Starter ou Professional?
- [ ] Verificação de email obrigatória para usar?
- [ ] Permitir múltiplos owners por org?
- [ ] Notificações por email ou apenas in-app?
