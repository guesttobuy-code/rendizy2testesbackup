# 🚀 SOLUÇÕES PARA DEPLOY EM PRODUÇÃO - MÓDULO AUTOMAÇÕES

**Problema:** Código local funciona com módulo de automações, mas produção não atualiza após push forçado.

---

## 🔍 DIAGNÓSTICO DO PROBLEMA

### Possíveis Causas Identificadas:

1. **Estrutura de Pastas:** Código está em `RendizyPrincipal/` mas Vercel pode estar buildando da raiz
2. **Configuração Vercel:** `vercel.json` na raiz aponta para `build/`, mas `RendizyPrincipal/vercel.json` aponta para `dist/`
3. **Cache do Vercel/CDN:** Cache antigo sendo servido
4. **Branch Git:** Vercel pode estar usando branch errada
5. **Build Command:** Comando de build pode estar errado
6. **Arquivos não rastreados:** Arquivos podem não estar no Git

---

## ✅ SOLUÇÃO 1: CORRIGIR CONFIGURAÇÃO DO VERCEL

### 1.1 Verificar qual pasta o Vercel está usando

No dashboard do Vercel:
- Vá em **Settings → General**
- Verifique **Root Directory**
- Deve estar: `RendizyPrincipal` (não raiz!)

### 1.2 Atualizar vercel.json na raiz

O `vercel.json` na raiz está apontando para `build/`, mas deve apontar para `dist/`:

```json
{
  "buildCommand": "cd RendizyPrincipal && npm run build",
  "outputDirectory": "RendizyPrincipal/dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**OU** mover o `vercel.json` de `RendizyPrincipal/` para a raiz e deletar o da raiz.

---

## ✅ SOLUÇÃO 2: DEPLOY MANUAL VIA VERCEL CLI

### 2.1 Instalar Vercel CLI

```powershell
npm install -g vercel
```

### 2.2 Fazer login

```powershell
vercel login
```

### 2.3 Deploy direto da pasta RendizyPrincipal

```powershell
cd "c:\Users\rafae\Downloads\login-que-funcionou-20251124-172504 BACKUP\RendizyPrincipal"
vercel --prod
```

Isso vai:
- Buildar o projeto
- Fazer deploy direto
- Ignorar configurações do Git

---

## ✅ SOLUÇÃO 3: BUILD LOCAL + DEPLOY DO DIST

### 3.1 Fazer build local

```powershell
cd "c:\Users\rafae\Downloads\login-que-funcionou-20251124-172504 BACKUP\RendizyPrincipal"
npm run build
```

### 3.2 Verificar se build foi criado

```powershell
Test-Path "dist\index.html"
```

### 3.3 Deploy apenas do dist

```powershell
vercel --prod --cwd RendizyPrincipal
```

**OU** usar o comando do package.json:

```powershell
cd RendizyPrincipal
npm run deploy:vercel
```

---

## ✅ SOLUÇÃO 4: LIMPAR CACHE E FORÇAR REBUILD

### 4.1 No Dashboard do Vercel

1. Vá em **Deployments**
2. Encontre o último deployment
3. Clique nos **3 pontos** → **Redeploy**
4. Marque **"Use existing Build Cache"** como **DESMARCADO**
5. Clique em **Redeploy**

### 4.2 Via CLI

```powershell
vercel --prod --force
```

### 4.3 Limpar cache do navegador/CDN

Adicione no `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    }
  ]
}
```

---

## ✅ SOLUÇÃO 5: VERIFICAR E CORRIGIR GIT

### 5.1 Verificar se arquivos estão rastreados

```powershell
cd "c:\Users\rafae\Downloads\login-que-funcionou-20251124-172504 BACKUP"
git status
```

### 5.2 Adicionar arquivos do módulo de automações

```powershell
git add RendizyPrincipal/components/automations/
git add RendizyPrincipal/utils/api.ts
git add RendizyPrincipal/App.tsx
git commit -m "feat: Adicionar módulo de automações"
git push --force
```

### 5.3 Verificar branch no Vercel

No dashboard do Vercel:
- **Settings → Git**
- Verifique qual branch está configurada (deve ser `main` ou `master`)

---

## ✅ SOLUÇÃO 6: DEPLOY ALTERNATIVO (NETLIFY)

### 6.1 Configurar Netlify

O projeto já tem `netlify.toml` em `RendizyPrincipal/`:

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

### 6.2 Deploy no Netlify

1. Acesse [netlify.com](https://netlify.com)
2. Conecte o repositório GitHub
3. Configure:
   - **Base directory:** `RendizyPrincipal`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`

### 6.3 Deploy via CLI

```powershell
cd RendizyPrincipal
npm install -g netlify-cli
netlify login
netlify deploy --prod
```

---

## ✅ SOLUÇÃO 7: VERIFICAR ESTRUTURA DE IMPORTS

### 7.1 Verificar se AutomationsModule está importado

No `App.tsx`, verificar se tem:

```typescript
import { AutomationsModule } from './components/automations/AutomationsModule';
```

### 7.2 Verificar se rota está registrada

No `App.tsx`, linha ~1232:

```typescript
<Route path="/automacoes/*" element={
  <ProtectedRoute>
    <AutomationsModule />
  </ProtectedRoute>
} />
```

### 7.3 Testar build local primeiro

```powershell
cd RendizyPrincipal
npm run build
npm run preview
```

Se funcionar local, o problema é no deploy, não no código.

---

## ✅ SOLUÇÃO 8: DEPLOY DIRETO DO ZIP

### 8.1 Criar build local

```powershell
cd RendizyPrincipal
npm run build
```

### 8.2 Compactar apenas o dist

```powershell
Compress-Archive -Path "dist\*" -DestinationPath "..\rendizy-dist-producao.zip" -Force
```

### 8.3 Upload manual no Vercel

1. No dashboard do Vercel
2. Vá em **Deployments**
3. Clique em **"..."** → **Upload**
4. Faça upload do ZIP

---

## ✅ SOLUÇÃO 9: USAR VARIÁVEIS DE AMBIENTE PARA FORÇAR REBUILD

### 9.1 Adicionar variável de ambiente no Vercel

No dashboard do Vercel:
- **Settings → Environment Variables**
- Adicione: `FORCE_REBUILD` = `20251126-001` (ou timestamp atual)

### 9.2 Usar no código

No `package.json` de `RendizyPrincipal`:

```json
{
  "build": "20251126-001"
}
```

Isso força o Vercel a reconhecer mudança.

---

## ✅ SOLUÇÃO 10: VERIFICAR ERROS DE BUILD

### 10.1 Ver logs do build no Vercel

1. Vá em **Deployments**
2. Clique no último deployment
3. Veja **Build Logs**
4. Procure por erros de:
   - Imports não encontrados
   - TypeScript errors
   - Dependências faltando

### 10.2 Testar build local com mesmo comando

```powershell
cd RendizyPrincipal
npm run build
```

Se der erro, corrigir antes de fazer deploy.

---

## 🎯 ORDEM RECOMENDADA DE TENTATIVAS

1. **Solução 1** - Corrigir configuração Vercel (mais provável)
2. **Solução 4** - Limpar cache e forçar rebuild
3. **Solução 2** - Deploy manual via CLI
4. **Solução 5** - Verificar Git
5. **Solução 7** - Verificar estrutura de código
6. **Solução 10** - Verificar erros de build
7. **Solução 3** - Build local + deploy dist
8. **Solução 6** - Deploy alternativo (Netlify)
9. **Solução 8** - Deploy direto do ZIP
10. **Solução 9** - Variáveis de ambiente

---

## 🔧 SCRIPT AUTOMATIZADO PARA TESTAR TODAS

Crie um arquivo `testar-deploy.ps1`:

```powershell
# Testar build local primeiro
Write-Host "1. Testando build local..." -ForegroundColor Cyan
cd "RendizyPrincipal"
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERRO: Build local falhou!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build local OK!" -ForegroundColor Green

# Verificar se dist foi criado
if (-not (Test-Path "dist\index.html")) {
    Write-Host "ERRO: dist/index.html não encontrado!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ dist/index.html encontrado!" -ForegroundColor Green

# Tentar deploy
Write-Host "2. Tentando deploy..." -ForegroundColor Cyan
vercel --prod --force

Write-Host "✅ Deploy concluído!" -ForegroundColor Green
```

---

## 📝 CHECKLIST FINAL

Antes de tentar qualquer solução:

- [ ] Build local funciona? (`npm run build` em RendizyPrincipal)
- [ ] Arquivos de automações estão no Git?
- [ ] Branch correta no Vercel?
- [ ] Root Directory correto no Vercel?
- [ ] Cache foi limpo?
- [ ] Logs de build foram verificados?

---

**Escolha a solução mais adequada e tente em ordem!** 🚀










