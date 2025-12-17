# 🚀 Scripts de Deploy - Rendizy

Scripts automatizados para fazer deploy no VS Code sem travamentos.

## 📋 Pré-requisitos

1. **Autenticação no Supabase** (só precisa fazer uma vez):
   ```powershell
   npx supabase login
   ```
   (Abra o link no navegador e autorize)

2. **Link do projeto** (só precisa fazer uma vez):
   ```powershell
   npx supabase link --project-ref odcgnzfremrqnvtitpcc
   ```

## 🎯 Como Usar no VS Code

### Opção 1: Usando Tasks (Recomendado)

1. Pressione `Ctrl+Shift+P` (ou `Cmd+Shift+P` no Mac)
2. Digite: `Tasks: Run Task`
3. Escolha uma das opções:
   - **🚀 Deploy Backend** - Deploy apenas das Edge Functions
   - **🗄️ Deploy Banco de Dados** - Deploy das migrations
   - **🌐 Deploy Frontend** - Push para GitHub (Vercel faz deploy automático)
   - **🚀 Deploy Completo** - Todos os deploys em sequência

### Opção 2: Terminal do VS Code

Abra o terminal integrado (`Ctrl+``) e execute:

```powershell
# Deploy individual
.\deploy-backend.ps1
.\deploy-db.ps1
.\deploy-frontend.ps1

# Deploy completo
.\deploy-completo.ps1 "sua mensagem de commit aqui"
```

## 📝 Scripts Disponíveis

### `deploy-backend.ps1`
- Deploy das Supabase Edge Functions (`rendizy-server`)
- Não requer interação

### `deploy-db.ps1`
- Push das migrations para o banco remoto
- Responde automaticamente "Y" quando solicitado

### `deploy-frontend.ps1`
- Adiciona mudanças, faz commit e push para GitHub
- Vercel faz deploy automático após o push
- Aceita mensagem de commit como parâmetro:
  ```powershell
  .\deploy-frontend.ps1 "fix: Correção importante"
  ```

### `deploy-completo.ps1`
- Executa todos os deploys em sequência
- Para no primeiro erro crítico (backend)
- Continua mesmo se banco falhar
- Aceita mensagem de commit:
  ```powershell
  .\deploy-completo.ps1 "feat: Nova funcionalidade"
  ```

## ⚠️ Solução de Problemas

### "Not logged in"
Execute: `npx supabase login`

### "Cannot find project ref"
Execute: `npx supabase link --project-ref odcgnzfremrqnvtitpcc`

### Script trava no "Initialising login role..."
- O script usa `echo Y |` para responder automaticamente
- Se ainda travar, execute manualmente: `npx supabase db push` e responda Y

### Erro de permissão ao executar scripts
Execute no PowerShell como Administrador:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 📍 Caminhos Configurados

Os scripts estão configurados para:
```
C:\Users\rafae\Downloads\Rendizy2producao-main github 15 11 2025\Rendizy2producao-main
```

Se o projeto estiver em outro local, edite a variável `$projectPath` em cada script.

