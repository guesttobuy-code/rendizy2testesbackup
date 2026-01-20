# 🔐 Variáveis de Ambiente para Vercel

## 📋 Copie e Cole Diretamente no Vercel

Ao configurar o projeto no Vercel, adicione estas variáveis de ambiente:

---

## ✅ Variáveis Obrigatórias (Frontend)

### 1. Supabase URL
```
VITE_SUPABASE_URL
https://gjphsheavnkdtmsrxmtl.supabase.co
```

### 2. Supabase Anon Key (Pública - Frontend)
```
VITE_SUPABASE_ANON_KEY
<SUPABASE_ANON_KEY>
```

---

## 🔒 Variáveis Opcionais (Backend/Edge Functions)

### 3. Supabase Service Role Key (Privada - Apenas Backend)
```
VITE_SUPABASE_SERVICE_ROLE_KEY
<SUPABASE_SERVICE_ROLE_KEY>
```

**⚠️ ATENÇÃO:** Esta chave só deve ser usada em Edge Functions ou server-side. Não exponha no frontend!

### 4. Gemini API Key (Opcional - Para Assistente de IA)
```
GEMINI_API_KEY
PLACEHOLDER_API_KEY
```

**📝 Nota:** Se você tiver uma chave do Gemini, substitua `PLACEHOLDER_API_KEY` pela chave real. Caso contrário, deixe assim ou não adicione esta variável.

---

## 📝 Formato para Copiar no Vercel

No Vercel, ao adicionar variáveis de ambiente, você verá dois campos:

- **Key** (Nome da variável)
- **Value** (Valor da variável)

### Copie assim:

**Variável 1:**
- Key: `VITE_SUPABASE_URL`
- Value: `https://gjphsheavnkdtmsrxmtl.supabase.co`

**Variável 2:**
- Key: `VITE_SUPABASE_ANON_KEY`
- Value: `<SUPABASE_ANON_KEY>`

**Variável 3 (Opcional - Backend):**
- Key: `VITE_SUPABASE_SERVICE_ROLE_KEY`
- Value: `<SUPABASE_SERVICE_ROLE_KEY>`

**Variável 4 (Opcional - Gemini):**
- Key: `GEMINI_API_KEY`
- Value: `PLACEHOLDER_API_KEY` (ou sua chave real se tiver)

---

## 🎯 Mínimo Necessário para Funcionar

Para o frontend funcionar, você precisa **APENAS** destas 2 variáveis:

1. ✅ `VITE_SUPABASE_URL`
2. ✅ `VITE_SUPABASE_ANON_KEY`

As outras são opcionais e dependem das funcionalidades que você quer usar.

---

## 📋 Checklist no Vercel

- [ ] Adicionar `VITE_SUPABASE_URL`
- [ ] Adicionar `VITE_SUPABASE_ANON_KEY`
- [ ] (Opcional) Adicionar `VITE_SUPABASE_SERVICE_ROLE_KEY` se usar Edge Functions
- [ ] (Opcional) Adicionar `GEMINI_API_KEY` se tiver chave do Gemini
- [ ] Salvar e fazer deploy

---

## 🔒 Segurança

- ✅ A `ANON_KEY` é segura para usar no frontend (tem RLS)
- ⚠️ A `SERVICE_ROLE_KEY` NUNCA deve ser exposta no frontend
- ✅ No Vercel, todas as variáveis são criptografadas

---

**🚀 Após adicionar as variáveis, faça o deploy e teste!**
