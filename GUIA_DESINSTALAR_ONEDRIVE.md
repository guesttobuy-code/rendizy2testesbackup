# Guia: Desinstalar OneDrive ou Mover Projeto

## 🎯 Problema
O OneDrive está causando conflitos de sincronização, restaurando versões antigas de arquivos com conflitos de merge do Git.

## ✅ Soluções

### Opção 1: Desinstalar OneDrive Completamente (Recomendado)

**Método 1: Via PowerShell (Como Administrador)**
```powershell
# Parar processos do OneDrive
Stop-Process -Name "OneDrive*" -Force

# Desinstalar
& "$env:ProgramFiles\Microsoft OneDrive\OneDrive.exe" /uninstall
```

**Método 2: Via Painel de Controle**
1. Abra "Painel de Controle" > "Programas" > "Desinstalar um programa"
2. Procure por "Microsoft OneDrive"
3. Clique em "Desinstalar"

**Método 3: Via Configurações do Windows**
1. Windows + I (Configurações)
2. Apps > Apps e recursos
3. Procure "OneDrive" > Desinstalar

### Opção 2: Apenas Pausar Sincronização Desta Pasta

1. Clique com botão direito na pasta `RENDIZY PASTA OFICIAL`
2. Selecione "OneDrive" > "Pausar sincronização"
3. OU: Clique com botão direito no ícone do OneDrive na bandeja > Configurações > Pausar sincronização

### Opção 3: Mover Projeto Para Fora do OneDrive (Melhor Solução)

**Passo a passo:**
1. Crie a pasta `C:\dev` (se não existir)
2. Mova a pasta `RENDIZY PASTA OFICIAL` de:
   - `C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL`
   - Para: `C:\dev\RENDIZY PASTA OFICIAL`
3. Feche o Cursor
4. Abra o Cursor novamente
5. Abra o workspace em `C:\dev\RENDIZY PASTA OFICIAL`

**Comando PowerShell:**
```powershell
# Criar diretório
New-Item -Path "C:\dev" -ItemType Directory -Force

# Mover projeto
Move-Item -Path "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL" -Destination "C:\dev\RENDIZY PASTA OFICIAL" -Force
```

## ⚠️ Atenção

- **Antes de desinstalar**: Certifique-se de que não precisa do OneDrive para outras coisas
- **Antes de mover**: Feche todos os programas que estão usando os arquivos
- **Backup**: Considere fazer backup antes de mover

## 🚀 Após Desinstalar/Mover

1. Reinicie o computador (se desinstalou o OneDrive)
2. Abra o Cursor no novo local
3. Execute `npm run dev` para testar
4. Os conflitos devem desaparecer!

## 📝 Script Automatizado

Execute o script `desinstalar-onedrive.ps1` que criamos para fazer tudo automaticamente.
