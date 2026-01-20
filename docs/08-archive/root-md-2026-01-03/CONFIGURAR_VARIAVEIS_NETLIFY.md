# 🔐 Como Configurar Variáveis de Ambiente no Netlify

## 📋 Método 1: Via Interface Web (RECOMENDADO - Mais Fácil)

### Passo a Passo:

1. **Acesse o Dashboard do Netlify**
   - Vá para: https://app.netlify.com
   - Faça login na sua conta

2. **Selecione seu Projeto**
   - Clique no projeto: `adorable-biscochitos-59023a` (ou o nome do seu projeto)

3. **Acesse as Configurações**
   - No menu lateral, clique em **"Site configuration"** ou **"Configuração do site"**
   - Ou vá em: **"Build & deploy"** → **"Environment variables"**

4. **Adicionar Variáveis**
   - Clique no botão **"Add a variable"** ou **"Adicionar variável"**
   - Preencha:
     - **Key** (Chave): Nome da variável (ex: `VITE_SUPABASE_URL`)
     - **Value** (Valor): Valor da variável
     - **Scopes** (Escopos): Selecione **"Production"** para produção

5. **Salvar**
   - Clique em **"Save"** ou **"Salvar"**
   - **IMPORTANTE**: Após adicionar variáveis, você precisa fazer um **novo deploy**!

---

## 📋 Método 2: Via Arquivo `netlify.toml` (Para Múltiplas Variáveis)

### Adicionar no `netlify.toml` na raiz:

```toml
[build.environment]
  NODE_VERSION = "18"
  # Variáveis de ambiente do Vite (precisam começar com VITE_)
  VITE_ENVIRONMENT = "production"
  VITE_USE_MOCK_DATA = "false"
  VITE_SUPABASE_URL = "https://odcgnzfremrqnvtitpcc.supabase.co"
  VITE_SUPABASE_ANON_KEY = "sua-chave-anon-aqui"
```

**⚠️ ATENÇÃO**: 
- Variáveis no `netlify.toml` são **públicas** (visíveis no repositório)
- **NUNCA** coloque senhas ou tokens secretos no `netlify.toml`
- Use a interface web para variáveis secretas

---

## 📋 Método 3: Via Netlify CLI (Para Desenvolvedores)

### Instalar Netlify CLI:
```bash
npm install -g netlify-cli
```

### Fazer login:
```bash
netlify login
```

### Adicionar variável:
```bash
netlify env:set VITE_SUPABASE_URL "https://odcgnzfremrqnvtitpcc.supabase.co" --context production
```

### Listar variáveis:
```bash
netlify env:list
```

### Importar de arquivo `.env`:
```bash
netlify env:import .env.production
```

---

## 🔍 Variáveis de Ambiente Usadas no Projeto

### Variáveis do Vite (Frontend):
- `VITE_ENVIRONMENT` - Ambiente: `development`, `staging`, ou `production`
- `VITE_USE_MOCK_DATA` - Usar dados mock: `true` ou `false`
- `VITE_SUPABASE_URL` - URL do Supabase
- `VITE_SUPABASE_ANON_KEY` - Chave anônima do Supabase

### Como Encontrar Todas as Variáveis:

Execute no terminal:
```bash
cd RendizyPrincipal
grep -r "VITE_\|import.meta.env" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -v node_modules
```

---

## ✅ Checklist de Configuração

- [ ] Acessar dashboard do Netlify
- [ ] Ir em "Site configuration" → "Environment variables"
- [ ] Adicionar `VITE_ENVIRONMENT` = `production`
- [ ] Adicionar `VITE_USE_MOCK_DATA` = `false`
- [ ] Adicionar `VITE_SUPABASE_URL` (se necessário)
- [ ] Adicionar `VITE_SUPABASE_ANON_KEY` (se necessário)
- [ ] Fazer novo deploy após adicionar variáveis

---

## 🚨 Importante: Variáveis Secretas

**NUNCA** coloque no `netlify.toml`:
- ❌ Tokens de API
- ❌ Senhas
- ❌ Chaves privadas
- ❌ Credenciais de banco de dados

**SEMPRE** use a interface web para variáveis secretas!

---

## 📝 Exemplo Completo

### No Dashboard do Netlify:

1. **Site configuration** → **Environment variables**
2. Clique em **"Add a variable"**
3. Adicione uma por uma:

```
Key: VITE_ENVIRONMENT
Value: production
Scope: Production
```

```
Key: VITE_USE_MOCK_DATA
Value: false
Scope: Production
```

4. Clique em **"Save"**
5. Vá em **"Deploys"** → **"Trigger deploy"** → **"Deploy site"**

---

## 🔄 Após Adicionar Variáveis

**SEMPRE** faça um novo deploy após adicionar/modificar variáveis:

1. No dashboard: **"Deploys"** → **"Trigger deploy"** → **"Deploy site"**
2. Ou via CLI: `netlify deploy --prod`

---

## ❓ Dúvidas?

- **Documentação oficial**: https://docs.netlify.com/environment-variables/overview/
- **Suporte Netlify**: https://www.netlify.com/support/

