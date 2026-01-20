# 🔗 Link para Tokens GitHub

## 📍 **LINK DIRETO:**

### **Criar Novo Token (Classic):**
🔗 **https://github.com/settings/tokens/new**

### **Gerenciar Tokens Existentes:**
🔗 **https://github.com/settings/tokens**

---

## 📋 **INSTRUÇÕES PARA CRIAR TOKEN:**

1. **Acesse o link:** https://github.com/settings/tokens/new

2. **Preencha os campos:**
   - **Note:** Dê um nome descritivo (ex: "Rendizy Push Token")
   - **Expiration:** Escolha a validade (90 dias, 1 ano, ou sem expiração)
   - **Select scopes:** Marque as permissões necessárias:
     - ✅ **`repo`** (Full control of private repositories) - **OBRIGATÓRIO para push**

3. **Clique em:** "Generate token"

4. **IMPORTANTE:** Copie o token imediatamente (ele só aparece uma vez!)
   - Formato: `ghp_...` (40 caracteres)

5. **Use o token:**
   ```powershell
   # Configurar remote com token
   git remote set-url origin "https://[SEU_TOKEN]@github.com/guesttobuy-code/Rendizyoficial.git"
   
   # Ou usar o script
   .\configurar-github-simples.ps1
   ```

---

## ⚠️ **IMPORTANTE:**

- ✅ Token precisa ser do usuário **`guesttobuy-code`** (dono do repositório)
- ✅ OU token precisa ter permissão para push no repositório `guesttobuy-code/Rendizyoficial`
- ✅ Escopo **`repo`** é obrigatório para fazer push

---

## 🔒 **SEGURANÇA:**

- ❌ **NUNCA** compartilhe o token publicamente
- ❌ **NUNCA** commite o token no Git
- ✅ Salve em `.env.local` (não versionado)
- ✅ Use variáveis de ambiente

---

**Link direto:** https://github.com/settings/tokens/new

