# 🏢 Arquitetura de Login Multi-Tenant por Subdomínio

**Data:** 02/12/2025  
**Status:** 🚀 Em implementação

---

## 🎯 CONCEITO

Cada imobiliária terá sua própria URL de login:
- `medhome.rendizy.com/login` → Organização Medhome
- `outraorg.rendizy.com/login` → Outra organização
- `localhost:5173/login` → Fallback (sem subdomínio)

---

## ✅ BENEFÍCIOS

1. **Isolamento Completo**
   - Cada organização tem sua própria URL
   - Sem confusão entre organizações
   - Segurança aprimorada

2. **URLs Personalizadas**
   - `medhome.rendizy.com` → Cliente reconhece facilmente
   - Melhor experiência do usuário
   - Profissionalismo

3. **Multi-Tenant Real**
   - Cada subdomínio = uma organização
   - Dados isolados automaticamente
   - Escalável

4. **Login Simples**
   - Email/Username + Senha
   - Sem confirmação por email (por enquanto)
   - Direto ao ponto

---

## 🔧 IMPLEMENTAÇÃO

### **1. Detecção de Subdomínio**

```typescript
// Frontend: Detectar subdomínio da URL
function getSubdomain(): string | null {
  const hostname = window.location.hostname;
  
  // localhost:5173 → null (sem subdomínio)
  if (hostname === 'localhost' || hostname.includes('127.0.0.1')) {
    return null;
  }
  
  // medhome.rendizy.com → "medhome"
  // medhome.netlify.app → "medhome"
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return parts[0]; // Primeira parte é o subdomínio
  }
  
  return null;
}
```

### **2. Buscar Organização por Subdomínio**

```typescript
// Backend: GET /organizations/by-subdomain/:subdomain
async function getOrganizationBySubdomain(subdomain: string) {
  // Buscar organização pelo slug ou subdomain do site
  const org = await supabase
    .from('organizations')
    .select('*')
    .ilike('slug', `rendizy_${subdomain}`)
    .single();
    
  return org;
}
```

### **3. Login Personalizado**

```typescript
// LoginPage: Detectar organização e personalizar
const subdomain = getSubdomain();
const organization = subdomain ? await fetchOrganization(subdomain) : null;

// Personalizar tela:
// - Logo da organização
// - Cores da organização
// - Nome da organização
```

### **4. Validação no Login**

```typescript
// Backend: Validar que usuário pertence à organização
async function login(username, password, organizationId) {
  const user = await findUser(username, password);
  
  if (user.organizationId !== organizationId) {
    throw new Error('Usuário não pertence a esta organização');
  }
  
  return user;
}
```

---

## 📋 FLUXO COMPLETO

### **1. Usuário acessa `medhome.rendizy.com/login`**

```
1. Frontend detecta subdomain = "medhome"
2. Busca organização pelo subdomain
3. Carrega dados da organização (logo, cores, nome)
4. Exibe tela de login personalizada
```

### **2. Usuário faz login**

```
1. Usuário digita: email/username + senha
2. Frontend envia: { username, password, organizationId }
3. Backend valida:
   - Usuário existe?
   - Senha correta?
   - Usuário pertence à organização?
4. Se tudo OK: retorna token + redireciona para dashboard
```

### **3. Após login**

```
1. Token salvo no localStorage
2. AuthContext carrega dados do usuário
3. Redireciona para /dashboard
4. Todas as requisições incluem organizationId automaticamente
```

---

## 🛠️ AJUSTES NECESSÁRIOS

### **Backend:**
1. ✅ Aceitar `password` na criação de usuário
2. ✅ Criar usuário com status `active` (não `invited`)
3. ✅ Endpoint `/organizations/by-subdomain/:subdomain`
4. ✅ Validar `organizationId` no login

### **Frontend:**
1. ✅ Detectar subdomínio na URL
2. ✅ Buscar organização por subdomínio
3. ✅ Personalizar tela de login
4. ✅ Enviar `organizationId` no login

---

## 🧪 TESTE

### **Localhost:**
```
http://localhost:5173/login
→ Sem subdomínio → Login genérico
```

### **Netlify (atual):**
```
https://adorable-biscochitos-59023a.netlify.app/login
→ Sem subdomínio → Login genérico
```

### **Futuro (com domínio):**
```
https://medhome.rendizy.com/login
→ Subdomain: "medhome" → Login personalizado Medhome
```

---

**Status:** 🚀 Implementando...

