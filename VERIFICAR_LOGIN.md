# 🔍 Como Verificar Status de Login

## Método 1: Via Script Node.js (CLI)

### 1. Obter o Token

1. Abra o preview: `http://localhost:5173/login`
2. Faça login
3. Abra o console do navegador (F12)
4. Execute: `localStorage.getItem('rendizy-token')`
5. Copie o token retornado

### 2. Testar Autenticação

```powershell
# Opção 1: Passar token como argumento
node test-auth.js <seu-token-aqui>

# Opção 2: Usar variável de ambiente
$env:RENDIZY_TOKEN="seu-token-aqui"
node test-auth.js
```

### 3. Interpretar Resultado

- ✅ **Status 200 + success: true** = Autenticação válida
- ❌ **Status 401** = Token inválido ou expirado
- ❌ **Status 500** = Erro no servidor

---

## Método 2: Via Navegador (Console)

### 1. Abrir Console (F12)

### 2. Executar:

```javascript
// Verificar se há token
const token = localStorage.getItem("rendizy-token");
console.log(
  "Token:",
  token ? token.substring(0, 20) + "..." : "NÃO ENCONTRADO"
);

// Testar autenticação
if (token) {
  fetch(
    "https://<PROJECT_REF>.supabase.co/functions/v1/rendizy-server/auth/me",
    {
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Bearer <SUPABASE_ANON_KEY>",
        "X-Auth-Token": token,
        apikey:
          "<SUPABASE_ANON_KEY>",
      },
    }
  )
    .then((r) => r.json())
    .then((data) => {
      if (data.success) {
        console.log("✅ Autenticação VÁLIDA!", data.data);
      } else {
        console.log("❌ Autenticação INVÁLIDA", data);
      }
    })
    .catch((err) => console.error("❌ Erro:", err));
} else {
  console.log("⚠️ Nenhum token encontrado. Faça login primeiro!");
}
```

---

## Método 3: Via Postman/Insomnia

### Request:

- **Method:** GET
- **URL:** `https://<PROJECT_REF>.supabase.co/functions/v1/rendizy-server/auth/me`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer <SUPABASE_ANON_KEY>`
  - `X-Auth-Token: <seu-token-aqui>`
  - `apikey: <SUPABASE_ANON_KEY>`

---

## 🔧 Solução de Problemas

### Token não encontrado

- Faça login novamente em `http://localhost:5173/login`
- Verifique se o token está sendo salvo: `localStorage.getItem('rendizy-token')`

### Status 401 (Unauthorized)

- Token pode ter expirado
- Faça login novamente
- Verifique se o token está correto (deve ter ~128 caracteres)

### Status 500 (Server Error)

- Verifique os logs do Supabase Dashboard
- Edge Functions → Logs → `rendizy-server`

---

## 📝 Próximos Passos

Após verificar que a autenticação está funcionando:

1. ✅ Testar criação de rascunho
2. ✅ Verificar se rascunho aparece na lista
3. ✅ Testar continuar edição de rascunho
