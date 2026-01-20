# 👑 Credenciais SuperAdmin - v1.0.103.260

**Data:** 03 NOV 2025  
**Versão:** v1.0.103.260  
**Status:** ✅ ATUALIZADO

---

## 🔑 CREDENCIAIS SUPERADMIN

O sistema RENDIZY possui **2 usuários SuperAdmin** configurados por padrão:

---

### **SuperAdmin 1: RPPT**

```
Usuário: rppt
Senha: root
```

**Detalhes:**
- **ID:** `superadmin_rppt`
- **Nome:** Super Administrador
- **Email:** admin@rendizy.com
- **Tipo:** superadmin
- **Status:** active

---

### **SuperAdmin 2: ADMIN**

```
Usuário: admin
Senha: root
```

**Detalhes:**
- **ID:** `superadmin_admin`
- **Nome:** Administrador
- **Email:** root@rendizy.com
- **Tipo:** superadmin
- **Status:** active

---

## 🎯 ONDE USAR

### **Tela de Login:**

1. Acesse: `http://localhost:5173/login` (dev) ou `https://seu-dominio.com/login` (prod)
2. Digite:
   - **Usuário:** `rppt` ou `admin`
   - **Senha:** `root`
3. Clique em **"Entrar"**

---

### **API Direct (cURL):**

```bash
# SuperAdmin RPPT
curl -X POST https://{projectId}.supabase.co/functions/v1/make-server-67caf26a/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "rppt",
    "password": "root"
  }'

# SuperAdmin ADMIN
curl -X POST https://{projectId}.supabase.co/functions/v1/make-server-67caf26a/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "root"
  }'
```

---

## 🔄 INICIALIZAÇÃO AUTOMÁTICA

Os SuperAdmins são **criados automaticamente** na primeira execução do backend:

### **Quando são criados:**

1. **Startup do servidor:** Ao iniciar `/supabase/functions/server/index.tsx`
2. **Chamada à API:** Ao fazer qualquer request para `/auth/*`
3. **Rota de init:** Ao chamar `POST /auth/init` manualmente

---

### **Como funciona:**

```typescript
// Função initializeSuperAdmin() em routes-auth.ts

async function initializeSuperAdmin() {
  const superAdmins = [
    {
      username: 'rppt',
      passwordHash: hashPassword('root'),
      name: 'Super Administrador',
      email: 'admin@rendizy.com',
      // ...
    },
    {
      username: 'admin',
      passwordHash: hashPassword('root'),
      name: 'Administrador',
      email: 'root@rendizy.com',
      // ...
    }
  ];

  // Para cada SuperAdmin
  for (const superAdmin of superAdmins) {
    const existing = await kv.get(`superadmin:${superAdmin.username}`);
    
    if (!existing) {
      await kv.set(`superadmin:${superAdmin.username}`, superAdmin);
      console.log(`✅ SuperAdmin inicializado: ${superAdmin.username} / root`);
    }
  }
}
```

---

## 🗄️ ARMAZENAMENTO NO SUPABASE

### **Tabela:** `kv_store_67caf26a`

**Keys criadas:**

1. `superadmin:rppt` → Dados do SuperAdmin RPPT
2. `superadmin:admin` → Dados do SuperAdmin ADMIN

---

### **Estrutura dos dados:**

```typescript
interface SuperAdmin {
  id: string;                    // "superadmin_rppt" ou "superadmin_admin"
  username: string;              // "rppt" ou "admin"
  passwordHash: string;          // SHA256 hash de "root"
  name: string;                  // "Super Administrador" ou "Administrador"
  email: string;                 // "admin@rendizy.com" ou "root@rendizy.com"
  type: 'superadmin';
  status: 'active' | 'suspended';
  createdAt: string;             // ISO timestamp
  lastLogin?: string;            // ISO timestamp do último login
}
```

---

## 🔐 SEGURANÇA

### **Hash de Senha:**

```typescript
// A senha "root" é hashada com SHA256
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

// Hash resultante:
// root → 4813494d137e1631bba301d5acab6e7bb7aa74ce1185d456565ef51d737677b2
```

---

### **Verificação de Login:**

```typescript
function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Ao fazer login:
// 1. Usuário digita: "root"
// 2. Sistema calcula hash: hashPassword("root")
// 3. Compara com hash armazenado
// 4. Se igual → Login sucesso ✅
```

---

## 👑 PERMISSÕES SUPERADMIN

### **O que um SuperAdmin pode fazer:**

- ✅ **Acessar TODAS as imobiliárias**
- ✅ **Criar novas imobiliárias**
- ✅ **Editar imobiliárias existentes**
- ✅ **Suspender/ativar imobiliárias**
- ✅ **Criar usuários em qualquer imobiliária**
- ✅ **Ver estatísticas globais**
- ✅ **Acessar logs e auditorias**
- ✅ **Gerenciar permissões**
- ✅ **Exportar dados**

---

### **Diferença para usuários de imobiliária:**

| Recurso | SuperAdmin | Usuário Imobiliária |
|---------|-----------|---------------------|
| **Ver todas imobiliárias** | ✅ Sim | ❌ Não |
| **Criar imobiliária** | ✅ Sim | ❌ Não |
| **Ver dados própria imobiliária** | ✅ Sim | ✅ Sim |
| **Ver dados outras imobiliárias** | ✅ Sim | ❌ Não |
| **Gerenciar usuários (própria)** | ✅ Sim | ✅ Sim (se admin) |
| **Gerenciar usuários (outras)** | ✅ Sim | ❌ Não |
| **Acesso ao painel admin** | ✅ Sim | ❌ Não |

---

## 🧪 COMO TESTAR

### **Teste 1: Login como RPPT**

1. Acesse `/login`
2. Digite:
   - Usuário: `rppt`
   - Senha: `root`
3. Clique "Entrar"

**Resultado Esperado:**
- ✅ Login bem-sucedido
- ✅ Toast: "Login realizado com sucesso!"
- ✅ Redireciona para `/`
- ✅ Console: `✅ Login SuperAdmin bem-sucedido: rppt`

---

### **Teste 2: Login como ADMIN**

1. Acesse `/login`
2. Digite:
   - Usuário: `admin`
   - Senha: `root`
3. Clique "Entrar"

**Resultado Esperado:**
- ✅ Login bem-sucedido
- ✅ Toast: "Login realizado com sucesso!"
- ✅ Redireciona para `/`
- ✅ Console: `✅ Login SuperAdmin bem-sucedido: admin`

---

### **Teste 3: Ver Perfil no Sidebar**

1. Após login, olhe o **rodapé da sidebar esquerda**
2. Deve mostrar:
   - **Avatar com coroa** 👑 (gradiente roxo→rosa)
   - **Nome:** "Super Administrador" ou "Administrador"
   - **Email:** "admin@rendizy.com" ou "root@rendizy.com"
   - **Badge:** "SuperAdmin" (roxo)

---

### **Teste 4: Dropdown de Perfil**

1. Clique no **perfil** no rodapé da sidebar
2. Deve abrir dropdown com:
   - ⚙️ **Configurações**
   - 👤 **Perfil**
   - 🚪 **Sair** (vermelho)

---

### **Teste 5: Logout**

1. Clique no perfil → **"Sair"**
2. Aguarde

**Resultado Esperado:**
- ✅ Botão muda para "Saindo..."
- ✅ Request `POST /auth/logout`
- ✅ localStorage limpo
- ✅ Toast: "Logout realizado com sucesso!"
- ✅ Redireciona para `/login`

---

## 🔄 FLUXO DE AUTENTICAÇÃO

### **Diagrama:**

```
┌─────────────┐
│   Usuário   │
└──────┬──────┘
       │ Digita: admin / root
       ▼
┌──────────────┐
│  LoginPage   │
└──────┬───────┘
       │ POST /auth/login
       │ {username: "admin", password: "root"}
       ▼
┌──────────────────┐
│  Backend (Hono)  │
│  routes-auth.ts  │
└──────┬───────────┘
       │
       ├─ Busca: superadmin:admin
       │  ├─ Encontrou? ✅
       │  └─ Verifica hash senha
       │     ├─ Hash correto? ✅
       │     └─ Status active? ✅
       │
       ├─ Cria sessão
       │  ├─ Gera token único
       │  ├─ Salva: session:{token}
       │  └─ Expira em: 24h
       │
       ├─ Atualiza lastLogin
       │
       └─ Retorna:
          {
            success: true,
            token: "...",
            user: { ... },
            expiresAt: "..."
          }
       │
       ▼
┌──────────────┐
│  AuthContext │
└──────┬───────┘
       │
       ├─ Salva token → localStorage
       ├─ Salva user → localStorage
       ├─ setUser(user)
       ├─ setIsAuthenticated(true)
       │
       └─ Toast success
       │
       ▼
┌──────────────┐
│  navigate('/')│
└──────────────┘
```

---

## 📊 VERIFICAÇÃO NO CONSOLE

### **Ao fazer login, você verá:**

```bash
# Backend logs:
🔐 POST /auth/login - Tentativa de login
👤 Login attempt: { username: 'admin' }
✅ Login SuperAdmin bem-sucedido: admin

# Frontend logs:
🔐 Fazendo login...
✅ Login bem-sucedido!
{
  success: true,
  token: "1a2b3c_xyz789_abc123",
  user: {
    id: "superadmin_admin",
    username: "admin",
    name: "Administrador",
    email: "root@rendizy.com",
    type: "superadmin",
    status: "active"
  },
  expiresAt: "2025-11-04T..."
}
```

---

## ⚠️ IMPORTANTE

### **Senhas de Produção:**

**NÃO USE** `root` como senha em produção!

**Recomendações:**

1. **Altere as senhas** assim que fizer o primeiro deploy
2. Use **senhas fortes** (mínimo 12 caracteres)
3. Combine **letras, números e símbolos**
4. Ative **2FA** (autenticação de dois fatores)
5. Implemente **rate limiting** (prevenir brute force)

---

### **Como alterar senha:**

```typescript
// Em routes-auth.ts, adicionar rota:
app.post('/change-password', async (c) => {
  const { oldPassword, newPassword } = await c.req.json();
  const token = c.req.header('Authorization')?.split(' ')[1];
  
  // 1. Verificar sessão
  // 2. Buscar usuário
  // 3. Verificar senha antiga
  // 4. Atualizar com nova senha hashada
  // 5. Retornar sucesso
});
```

---

## 📁 ARQUIVOS RELACIONADOS

### **Backend:**
- `/supabase/functions/server/routes-auth.ts` - Rotas de autenticação
- `/supabase/functions/server/kv_store.tsx` - Acesso ao KV Store

### **Frontend:**
- `/components/LoginPage.tsx` - Tela de login
- `/contexts/AuthContext.tsx` - Contexto de autenticação
- `/components/MainSidebar.tsx` - Perfil e logout

### **Documentação:**
- `/docs/MULTI_TENANT_LOGIN_SYSTEM_v1.0.103.259.md` - Sistema completo
- `/docs/LOGOUT_BUTTON_SUPERADMIN_v1.0.103.260.md` - Botão de logout
- `/docs/SUPERADMIN_CREDENTIALS_v1.0.103.260.md` - Este arquivo

---

## ✅ CHECKLIST DE VERIFICAÇÃO

- [x] SuperAdmin RPPT criado automaticamente
- [x] SuperAdmin ADMIN criado automaticamente
- [x] Ambos com senha "root"
- [x] Hash SHA256 funcionando
- [x] Login via API funcionando
- [x] Login via tela funcionando
- [x] Sessão com expiração 24h
- [x] Token único por sessão
- [x] Logout funcionando
- [x] Perfil visível na sidebar
- [x] Badge "SuperAdmin" exibido
- [x] Ícone de coroa 👑 exibido
- [x] Dropdown com opções
- [x] Botão "Sair" funcionando
- [x] Redirecionamento após logout

---

## 🚀 RESUMO

**O sistema agora possui 2 SuperAdmins:**

| Usuário | Senha | Nome | Email |
|---------|-------|------|-------|
| **rppt** | root | Super Administrador | admin@rendizy.com |
| **admin** | root | Administrador | root@rendizy.com |

**Ambos têm:**
- ✅ Acesso total ao sistema
- ✅ Permissões de SuperAdmin
- ✅ Avatar com coroa 👑
- ✅ Badge especial
- ✅ Podem criar/gerenciar imobiliárias
- ✅ Podem criar/gerenciar usuários
- ✅ Acesso ao painel administrativo

**Próximos passos:**
1. ✅ Testar ambos os logins
2. ✅ Verificar perfil na sidebar
3. ✅ Testar logout
4. ⚠️ Alterar senhas em produção
5. ⚠️ Implementar 2FA (futuro)

---

**Versão:** v1.0.103.260  
**Data:** 03 NOV 2025  
**Status:** ✅ IMPLEMENTADO  

🎉 **Sistema pronto para uso!**
