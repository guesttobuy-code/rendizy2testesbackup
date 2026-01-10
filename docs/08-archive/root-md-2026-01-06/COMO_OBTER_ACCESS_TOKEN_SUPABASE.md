# 🔑 Como Obter Access Token do Supabase CLI

**Data:** 2024-11-21  
**Situação:** Você está na página de API Keys, mas precisa do Access Token para o CLI

---

## 🎯 O Problema

Você está em: **Settings > API Keys** (do projeto)

Mas o **Access Token para CLI** fica em: **Account Settings > Access Tokens** (da conta)

São coisas diferentes! ⚠️

---

## 📍 Passo a Passo para Encontrar o Access Token

### **1. Clique no seu Avatar/Perfil**

📍 **Localização:** Canto superior direito da tela (ícone de perfil/avatar)

### **2. Selecione "Account Settings"**

Depois de clicar no avatar, você verá um menu. Procure por:
- **"Account Settings"** ou
- **"Account"** ou  
- **"Profile"**

### **3. Vá em "Access Tokens"**

Dentro de Account Settings, procure pela aba/seção:
- **"Access Tokens"** ou
- **"Tokens"** ou
- **"API Tokens"**

### **4. Link Direto (se tiver acesso):**

🔗 **https://supabase.com/dashboard/account/tokens**

---

## 🔗 Links Diretos

### **Opção 1: Via Dashboard**

1. Acesse: https://supabase.com/dashboard
2. Clique no seu **avatar/perfil** (canto superior direito)
3. Selecione **"Account Settings"** ou **"Profile"**
4. Procure por **"Access Tokens"** ou **"Tokens"**

### **Opção 2: Link Direto**

🔗 **https://supabase.com/dashboard/account/tokens**

(Tente acessar diretamente este link)

---

## 📋 Diferença Entre os Tokens

| Tipo | Onde Fica | Formato | Uso |
|------|-----------|---------|-----|
| **API Key (Secret)** | Settings > API Keys | `sb_secret_...` | Edge Functions, Apps |
| **Access Token (CLI)** | Account > Access Tokens | `sbp_...` | Supabase CLI |

---

## ✅ O Que Você Precisa

Para fazer login no Supabase CLI, você precisa de um token que:

- ✅ Começa com `sbp_...` (não `sb_secret_...`)
- ✅ Está em **Account Settings** (não Project Settings)
- ✅ É um **Access Token** (não API Key)

---

## 🚀 Como Gerar o Access Token

1. **Acesse:** https://supabase.com/dashboard/account/tokens
   (Ou: Avatar > Account Settings > Access Tokens)

2. **Clique em:** "Generate new token" ou "Create token"

3. **Preencha:**
   - **Name:** `Rendizy CLI` (ou nome de sua preferência)
   - **Expires in:** Escolha (recomendo `Never` para desenvolvimento)

4. **Clique em:** "Generate token"

5. **COPIE O TOKEN** (formato: `sbp_...`)

6. **⚠️ IMPORTANTE:** O token só aparece uma vez! Copie imediatamente.

---

## 🔧 Depois de Obter o Token

### **1. Fazer Login no CLI:**

```powershell
# Configure o token
$env:SUPABASE_ACCESS_TOKEN = "sbp_..." # (cole o token aqui)

# Faça login
npx supabase login --token $env:SUPABASE_ACCESS_TOKEN

# Verifique login
npx supabase projects list
```

### **2. Linkar Projeto:**

```powershell
npx supabase link --project-ref odcgnzfremrqnvtitpcc
```

### **3. Salvar no .env.local:**

Edite o arquivo `.env.local` e adicione:

```env
SUPABASE_ACCESS_TOKEN=sbp_... (cole o token aqui)
```

---

## 📸 Navegação Visual

```
Supabase Dashboard
├── [Avatar/Perfil] (canto superior direito) ← CLIQUE AQUI!
│   └── Account Settings
│       └── Access Tokens ← AQUI ESTÁ O TOKEN DO CLI!
│
└── [Settings] (menu lateral) ← ONDE VOCÊ ESTÁ AGORA
    └── API Keys ← API Keys do projeto (não serve para CLI)
```

---

## 🆘 Se Não Conseguir Encontrar

### **Opção 1: Login Interativo (Mais Fácil)**

Se não conseguir encontrar o token, use login interativo:

```powershell
npx supabase login
```

Isso vai abrir o navegador para você fazer login diretamente.

### **Opção 2: Verificar Permissões**

Certifique-se de que você tem permissões na conta do Supabase:
- Você precisa ser o **owner** ou ter **admin access** na conta
- Se for membro de organização, pode precisar pedir ao owner

---

## 📝 Resumo

**Onde você está:** Settings > API Keys (do projeto) ❌  
**Onde precisa ir:** Account Settings > Access Tokens (da conta) ✅

**Link direto:** https://supabase.com/dashboard/account/tokens

**Formato do token:** `sbp_...` (não `sb_secret_...`)

---

**Última atualização:** 2024-11-21

