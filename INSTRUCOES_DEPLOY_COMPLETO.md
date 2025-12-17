# 🚀 INSTRUÇÕES COMPLETAS - DEPLOY E APLICAÇÃO DE MIGRATIONS

**Data:** 2024-11-21  
**Objetivo:** Fazer o login funcionar AGORA!

---

## ✅ PASSO 1: APLICAR MIGRATIONS NO SUPABASE

### **1.1. Acessar SQL Editor**

1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/sql
2. Clique em **"New query"**

### **1.2. Aplicar Migrations**

**OPÇÃO A: Aplicar tudo de uma vez (RECOMENDADO)**

1. Abra o arquivo: `APLICAR_MIGRATIONS_COMPLETAS.sql`
2. Copie TODO o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em **"Run"** (ou pressione `Ctrl+Enter`)
5. Aguarde a execução

**OPÇÃO B: Aplicar uma por uma (se houver erro)**

1. Execute `supabase/migrations/20241119_create_default_organization.sql`
2. Execute `supabase/migrations/20241120_create_users_table.sql`
3. Execute `supabase/migrations/20241121_create_sessions_table.sql`

### **1.3. Verificar se Tabelas Foram Criadas**

Execute este SQL:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('organizations', 'users', 'sessions')
ORDER BY table_name;
```

**Resultado esperado:**
```
organizations
sessions
users
```

### **1.4. Verificar se Usuários Foram Criados**

Execute este SQL:
```sql
SELECT username, email, type, status FROM users;
```

**Resultado esperado:**
```
username | email                        | type       | status
---------|------------------------------|------------|--------
admin    | root@rendizy.com            | superadmin | active
rppt     | suacasarendemais@gmail.com  | superadmin | active
```

---

## ✅ PASSO 2: DEPLOY DA EDGE FUNCTION

### **2.1. Via Supabase Dashboard (MAIS FÁCIL)**

1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions
2. Clique em **"rendizy-server"** (se existir) ou **"Deploy a new function"**
3. Se já existe, clique em **"Update"** ou **"Redeploy"**
4. Faça upload da pasta: `supabase/functions/rendizy-server/`
5. Aguarde o deploy completar

### **2.2. Via CLI (ALTERNATIVA)**

```powershell
# Fazer login (se ainda não fez)
npx supabase login

# Linkar projeto (se ainda não linkou)
npx supabase link --project-ref odcgnzfremrqnvtitpcc

# Deploy da função
npx supabase functions deploy rendizy-server
```

### **2.3. Verificar Deploy**

1. Acesse: https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions/rendizy-server
2. Verifique se a função está **"Active"**
3. Verifique os logs (se houver erros)

---

## ✅ PASSO 3: TESTAR LOGIN

### **3.1. Testar no Frontend**

1. Acesse: https://rendizy2producao-am7c.vercel.app/login
2. Preencha:
   - Usuário: `rppt`
   - Senha: `root`
3. Clique em **"Entrar"**
4. Verifique se login funciona

### **3.2. Testar Diretamente na API**

Execute no terminal (PowerShell):
```powershell
$projectId = "odcgnzfremrqnvtitpcc"
$url = "https://$projectId.supabase.co/functions/v1/rendizy-server/auth/login"

$body = @{
    username = "rppt"
    password = "root"
} | ConvertTo-Json

Invoke-RestMethod -Uri $url -Method POST -Body $body -ContentType "application/json" -Headers @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kY2duemZyZW1ycW52dGl0cGNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzNTQxNzEsImV4cCI6MjA3NzkzMDE3MX0.aljqrK3mKwQ6T6EB_fDPfkbP7QC_hhiZwxUZbtnqVqQ"
}
```

**Resultado esperado:**
```json
{
  "success": true,
  "token": "...",
  "user": {
    "id": "...",
    "username": "rppt",
    "email": "suacasarendemais@gmail.com",
    "type": "superadmin",
    "status": "active"
  },
  "expiresAt": "..."
}
```

---

## 🚨 TROUBLESHOOTING

### **Problema 1: Tabela não existe**

**Erro:**
```
ERROR: relation "users" does not exist
```

**Solução:**
- Verificar se migration foi aplicada
- Re-executar migration

### **Problema 2: Rota não encontrada**

**Erro:**
```
Route POST /rendizy-server/auth/login not found
```

**Solução:**
- Verificar se Edge Function foi deployada
- Verificar se rota está correta no código
- Fazer redeploy da função

### **Problema 3: Usuário não encontrado**

**Erro:**
```
Usuário ou senha incorretos
```

**Solução:**
- Verificar se usuários foram criados: `SELECT * FROM users;`
- Verificar se senha está correta (hash de "root")

### **Problema 4: Sessão não criada**

**Erro:**
```
Erro ao criar sessão no SQL
```

**Solução:**
- Verificar se tabela `sessions` existe
- Verificar se migration `sessions` foi aplicada

---

## ✅ CHECKLIST FINAL

Antes de testar, verifique:

- [ ] Migration `organizations` aplicada
- [ ] Migration `users` aplicada
- [ ] Migration `sessions` aplicada
- [ ] Tabela `users` tem usuários (rppt, admin)
- [ ] Edge Function deployada
- [ ] Rota `/rendizy-server/auth` está ativa
- [ ] Frontend está chamando URL correta

---

## 🎯 RESULTADO ESPERADO

Após seguir todos os passos:

✅ Login funciona no frontend  
✅ Token é retornado corretamente  
✅ Sessão é criada no banco  
✅ Usuário é autenticado com sucesso  

---

**Última atualização:** 2024-11-21  
**Status:** ✅ Pronto para aplicar!

