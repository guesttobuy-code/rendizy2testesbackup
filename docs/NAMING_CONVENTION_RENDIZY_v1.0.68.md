# 👑 NAMING CONVENTION RENDIZY - v1.0.68

**Data:** 28 de Outubro de 2025  
**Versão:** v1.0.68  
**Build:** 20251028-068

---

## 🎯 OBJETIVO

Estabelecer uma convenção de naming clara e consistente para diferenciar a **Organização Master (RENDIZY)** das **Organizações Clientes** no sistema SaaS Multi-Tenant.

---

## 📋 CONVENÇÃO DE NAMING

### Estrutura de Slugs

```
MASTER:   rendizy
CLIENTES: rendizy_[nome-cliente]
```

### Exemplos Práticos

| Organização | Slug | Tipo |
|-------------|------|------|
| **RENDIZY** | `rendizy` | 🟣 Master |
| GuestToBuy Imóveis | `rendizy_guesttobuy` | 🔵 Cliente |
| Temporada Feliz | `rendizy_temporadafeliz` | 🔵 Cliente |
| Costa Azul Imóveis | `rendizy_costaazul` | 🔵 Cliente |
| Vista Mar Properties | `rendizy_vistamar` | 🔵 Cliente |
| Beach Paradise | `rendizy_beachparadise` | 🔵 Cliente |

---

## 🏗️ IMPLEMENTAÇÃO TÉCNICA

### 1. Tipos e Interfaces

**Arquivo:** `/types/tenancy.ts`

```typescript
export interface Organization {
  id: string;
  name: string;
  slug: string; // "rendizy" ou "rendizy_cliente"
  isMaster?: boolean; // true para RENDIZY
  // ... outros campos
}
```

### 2. Constantes

```typescript
export const MASTER_ORG_SLUG = 'rendizy';
export const ORG_SLUG_PREFIX = 'rendizy_';
```

### 3. Helper Functions

#### `isMasterOrganization()`
Verifica se uma organização é a Master

```typescript
export function isMasterOrganization(org: Organization): boolean {
  return org.slug === MASTER_ORG_SLUG || org.isMaster === true;
}

// Uso
const isMaster = isMasterOrganization(organization);
if (isMaster) {
  // Lógica específica para master
}
```

#### `isClientOrganization()`
Verifica se uma organização é cliente

```typescript
export function isClientOrganization(org: Organization): boolean {
  return org.slug.startsWith(ORG_SLUG_PREFIX) && 
         org.slug !== MASTER_ORG_SLUG;
}

// Uso
const isClient = isClientOrganization(organization);
```

#### `generateClientSlug()`
Gera slug automático para novos clientes

```typescript
export function generateClientSlug(clientName: string): string {
  const normalized = clientName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove especiais
    .replace(/\s+/g, '') // Remove espaços
    .trim();
  
  return `${ORG_SLUG_PREFIX}${normalized}`;
}

// Exemplos
generateClientSlug("Guest to Buy") 
// → "rendizy_guesttobuy"

generateClientSlug("Temporada Feliz")
// → "rendizy_temporadafeliz"

generateClientSlug("Costa Azul Imóveis")
// → "rendizy_costaazulimoveis"
```

#### `extractClientName()`
Extrai nome do cliente do slug

```typescript
export function extractClientName(slug: string): string {
  if (slug === MASTER_ORG_SLUG) {
    return 'RENDIZY (Master)';
  }
  
  if (slug.startsWith(ORG_SLUG_PREFIX)) {
    return slug.replace(ORG_SLUG_PREFIX, '');
  }
  
  return slug;
}

// Exemplos
extractClientName("rendizy") 
// → "RENDIZY (Master)"

extractClientName("rendizy_guesttobuy")
// → "guesttobuy"
```

#### `isValidOrganizationSlug()`
Valida formato do slug

```typescript
export function isValidOrganizationSlug(slug: string): boolean {
  // Master org
  if (slug === MASTER_ORG_SLUG) {
    return true;
  }
  
  // Client org
  if (slug.startsWith(ORG_SLUG_PREFIX)) {
    const clientPart = slug.replace(ORG_SLUG_PREFIX, '');
    // Mínimo 3 caracteres, apenas lowercase e números
    return clientPart.length >= 3 && /^[a-z0-9]+$/.test(clientPart);
  }
  
  return false;
}

// Exemplos
isValidOrganizationSlug("rendizy") // ✅ true
isValidOrganizationSlug("rendizy_guesttobuy") // ✅ true
isValidOrganizationSlug("rendizy_ab") // ❌ false (muito curto)
isValidOrganizationSlug("rendizy_Guest") // ❌ false (uppercase)
isValidOrganizationSlug("guesttobuy") // ❌ false (sem prefixo)
```

---

## 🎨 VISUAL INDICATORS

### Organização Master - RENDIZY

**Características Visuais:**

1. **Background Destacado**
   - Cor: `bg-purple-50` (roxo claro)
   - Border esquerda: `border-l-4 border-l-purple-500`

2. **Badge MASTER**
   - Cor: `bg-purple-600 text-white`
   - Texto: "MASTER"
   - Posição: Ao lado do nome

3. **Nome em Negrito**
   - Classe: `font-bold text-purple-900`
   - Destaque visual maior

4. **Slug Visível**
   - Mostra "rendizy" em font mono
   - Classe: `text-xs text-gray-400 font-mono`

5. **Ações Bloqueadas**
   - Não é possível suspender/ativar o Master
   - Apenas visualização disponível

**Exemplo Visual:**
```
┌────────────────────────────────────────────────┐
│ ║ RENDIZY [MASTER]                    🟣        │
│ ║ admin@rendizy.com                             │
│ ║ rendizy                                       │
└────────────────────────────────────────────────┘
  ↑ Barra roxa à esquerda
```

### Organizações Clientes

**Características Visuais:**

1. **Background Normal**
   - Cor: `bg-white`
   - Sem destaque especial

2. **Nome Normal**
   - Classe: `text-gray-900`
   - Peso normal

3. **Slug com Prefixo**
   - Mostra "rendizy_guesttobuy"
   - Classe: `text-xs text-gray-400 font-mono`

4. **Ações Disponíveis**
   - Suspender/Ativar habilitados
   - Editar disponível

**Exemplo Visual:**
```
┌────────────────────────────────────────────────┐
│ GuestToBuy Imóveis                             │
│ contato@guesttobuy.com                         │
│ rendizy_guesttobuy                             │
└────────────────────────────────────────────────┘
```

---

## 🔧 COMPONENTE TenantManagement

### Filtro "Mostrar Master"

**Botão Toggle:**
```tsx
<Button
  variant={showMaster ? "default" : "outline"}
  size="sm"
  onClick={() => setShowMaster(!showMaster)}
  className="gap-2"
>
  <Crown className="h-4 w-4" />
  {showMaster ? 'Mostrando Master' : 'Ocultando Master'}
</Button>
```

**Estados:**
- `showMaster = true` → Mostra RENDIZY + Clientes
- `showMaster = false` → Mostra apenas Clientes

### Filtro de Organizações

```typescript
const filteredOrgs = organizations.filter(org => {
  // Filtro de master
  if (!showMaster && isMasterOrganization(org)) {
    return false;
  }
  
  // Outros filtros...
  return matchesSearch && matchesStatus && matchesPlan;
});
```

### Estatísticas

**Apenas Clientes (sem Master):**

```typescript
const clientOrgs = organizations.filter(o => !isMasterOrganization(o));
const totalOrgs = clientOrgs.length;
const activeOrgs = clientOrgs.filter(o => o.status === 'active').length;
const trialOrgs = clientOrgs.filter(o => o.status === 'trial').length;
```

**Motivo:** MRR e métricas devem refletir apenas clientes pagantes.

### Input de Slug

**Prefixo Automático:**

```tsx
<div className="space-y-2">
  <Label>Slug (URL) *</Label>
  <div className="flex gap-2">
    <div className="flex items-center px-3 py-2 bg-gray-100 
                    border border-gray-200 rounded-md text-sm text-gray-600">
      rendizy_
    </div>
    <Input placeholder="guesttobuy" className="flex-1" />
  </div>
  <p className="text-xs text-gray-500">
    Será criado como: rendizy_[nome]
  </p>
</div>
```

**Benefício:** Usuário só preenche a parte única do slug.

---

## 📊 MOCK DATA

### Organização Master

```typescript
{
  id: '0',
  name: 'RENDIZY',
  slug: 'rendizy',
  isMaster: true,
  status: 'active',
  plan: 'enterprise',
  email: 'admin@rendizy.com',
  phone: '(11) 99999-9999',
  legalName: 'Rendizy Software Ltda',
  taxId: '00.000.000/0001-00',
  settings: {
    language: 'pt',
    timezone: 'America/Sao_Paulo',
    currency: 'BRL',
    dateFormat: 'DD/MM/YYYY',
    maxUsers: 999,
    maxProperties: 999
  },
  limits: {
    users: 999,
    properties: 999,
    reservations: 999999,
    storage: 999999
  },
  usage: {
    users: 5,
    properties: 0,
    reservations: 0,
    storage: 1000
  },
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date()
}
```

### Exemplo Cliente

```typescript
{
  id: '1',
  name: 'GuestToBuy Imóveis',
  slug: 'rendizy_guesttobuy',
  status: 'active',
  plan: 'professional',
  email: 'contato@guesttobuy.com.br',
  // ... outros campos
}
```

---

## ✅ BENEFÍCIOS DA CONVENÇÃO

### 1. Identificação Rápida
- **Visual:** Cor roxa = Master, Branco = Cliente
- **Slug:** Começa com "rendizy_" = Cliente
- **Badge:** "MASTER" = Organização principal

### 2. Queries Facilitadas

```sql
-- Buscar apenas clientes
SELECT * FROM organizations 
WHERE slug LIKE 'rendizy_%';

-- Buscar apenas master
SELECT * FROM organizations 
WHERE slug = 'rendizy';

-- Contar clientes
SELECT COUNT(*) FROM organizations 
WHERE slug LIKE 'rendizy_%';
```

### 3. Filtros e Buscas

```typescript
// Filtrar apenas clientes
const clients = orgs.filter(o => 
  o.slug.startsWith('rendizy_')
);

// Encontrar master
const master = orgs.find(o => 
  o.slug === 'rendizy'
);
```

### 4. Namespace Único
- Evita conflitos de nome
- Hierarquia clara
- Branding consistente

### 5. Escalabilidade
- Suporta milhares de clientes
- Fácil adicionar novos
- Simples de gerenciar

---

## 🚫 REGRAS E VALIDAÇÕES

### Regras de Criação

1. **Slug Master Reservado**
   - ❌ Não é possível criar cliente com slug "rendizy"
   - ✅ Apenas um Master no sistema

2. **Prefixo Obrigatório**
   - ❌ Cliente sem prefixo: "guesttobuy"
   - ✅ Cliente com prefixo: "rendizy_guesttobuy"

3. **Formato do Slug**
   - ✅ Apenas lowercase (a-z)
   - ✅ Apenas números (0-9)
   - ❌ Sem espaços
   - ❌ Sem caracteres especiais
   - ❌ Sem acentos
   - ✅ Mínimo 3 caracteres após prefixo

4. **Unicidade**
   - Cada slug deve ser único no sistema
   - Verificar antes de criar

### Validações no Backend

```typescript
// API Route: POST /api/organizations
async function createOrganization(data) {
  // 1. Validar formato
  if (!isValidOrganizationSlug(data.slug)) {
    throw new Error('Slug inválido');
  }
  
  // 2. Verificar se não é master
  if (data.slug === MASTER_ORG_SLUG && !data.isMaster) {
    throw new Error('Slug "rendizy" reservado');
  }
  
  // 3. Verificar unicidade
  const exists = await db.organizations.findOne({ slug: data.slug });
  if (exists) {
    throw new Error('Slug já existe');
  }
  
  // 4. Criar organização
  const org = await db.organizations.create(data);
  return org;
}
```

---

## 📝 EXEMPLOS DE USO

### Criar Nova Organização Cliente

```typescript
const newClient = {
  name: 'Praia Imóveis',
  slug: generateClientSlug('Praia Imóveis'), // → "rendizy_praiaimoveis"
  plan: 'basic',
  status: 'trial',
  email: 'contato@praiaimoveis.com'
};

await createOrganization(newClient);
```

### Listar Apenas Clientes

```typescript
const clients = organizations.filter(org => 
  isClientOrganization(org)
);

console.log(`Total de clientes: ${clients.length}`);
```

### Calcular MRR

```typescript
const mrr = organizations
  .filter(org => !isMasterOrganization(org)) // Sem master
  .filter(org => org.status === 'active')
  .reduce((total, org) => {
    const prices = { free: 0, basic: 99, professional: 299, enterprise: 999 };
    return total + prices[org.plan];
  }, 0);

console.log(`MRR: R$ ${mrr}`);
```

### Renderizar com Indicadores

```tsx
{organizations.map(org => {
  const isMaster = isMasterOrganization(org);
  
  return (
    <div 
      key={org.id}
      className={cn(
        "p-4 border rounded",
        isMaster && "bg-purple-50 border-purple-500"
      )}
    >
      <div className="flex items-center gap-2">
        <h3 className={cn(
          "text-lg",
          isMaster && "font-bold text-purple-900"
        )}>
          {org.name}
        </h3>
        {isMaster && (
          <Badge className="bg-purple-600 text-white">
            MASTER
          </Badge>
        )}
      </div>
      <p className="text-sm text-gray-500">{org.email}</p>
      <p className="text-xs text-gray-400 font-mono">{org.slug}</p>
    </div>
  );
})}
```

---

## 🎯 CHECKLIST DE IMPLEMENTAÇÃO

### Frontend ✅
- [x] Interface `Organization` com `isMaster?`
- [x] Constantes `MASTER_ORG_SLUG` e `ORG_SLUG_PREFIX`
- [x] Helper `isMasterOrganization()`
- [x] Helper `isClientOrganization()`
- [x] Helper `generateClientSlug()`
- [x] Helper `extractClientName()`
- [x] Helper `isValidOrganizationSlug()`
- [x] Mock data com RENDIZY master
- [x] Mock data com clientes usando prefixo
- [x] Visual indicator na tabela (roxo)
- [x] Badge "MASTER"
- [x] Filtro "Mostrar Master"
- [x] Stats sem master
- [x] Input com prefixo automático
- [x] Slug visível em cada org

### Backend (Pendente)
- [ ] Validação de slug no servidor
- [ ] Impedir criação de segundo master
- [ ] Impedir uso de "rendizy" por clientes
- [ ] Validação de formato (lowercase, sem especiais)
- [ ] Verificação de unicidade
- [ ] Seed com organização RENDIZY
- [ ] Migrations para campo `isMaster`

### Documentação ✅
- [x] Documentação completa desta convenção
- [x] Atualização do DIARIO_RENDIZY
- [x] Snapshot diário
- [x] CACHE_BUSTER atualizado

---

## 🎉 CONCLUSÃO

A **Naming Convention RENDIZY** estabelece uma estrutura clara e escalável para gerenciar milhares de organizações clientes no sistema SaaS Multi-Tenant.

**Principais Vantagens:**

✅ **Identificação Visual Imediata** - Master em roxo, clientes em branco  
✅ **Namespace Único** - Todos slugs começam com "rendizy_"  
✅ **Queries Simplificadas** - Fácil filtrar master vs clientes  
✅ **Escalável** - Suporta crescimento infinito  
✅ **Profissional** - Branding consistente  
✅ **Seguro** - Slug master reservado e protegido  

**Próximo Passo:**  
Implementar validações no backend para garantir integridade da convenção.

---

**Versão:** v1.0.68  
**Data:** 28 de Outubro de 2025  
**Status:** ✅ IMPLEMENTADO E DOCUMENTADO
