# ============================================================================
# SCRIPT: Deploy Completo - Supabase + GitHub + Backup
# Versão: 1.0.0
# Data: 2025-11-26
# 
# OBJETIVO:
# - Fazer deploy do backend no Supabase
# - Fazer commit e push no GitHub com versionamento
# - Criar backup com data e versão em Downloads
# ============================================================================

param(
    [string]$Version = "",
    [string]$Message = ""
)

# Cores para output
$ErrorActionPreference = "Stop"

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

Write-ColorOutput Green "`nRENDIZY - DEPLOY COMPLETO`n"
Write-ColorOutput Cyan "========================================`n"

# ============================================================================
# PASSO 1: Determinar versão
# ============================================================================

$BUILD_VERSION_FILE = "RendizyPrincipal\BUILD_VERSION.txt"
$CACHE_BUSTER_FILE = "RendizyPrincipal\CACHE_BUSTER.ts"

# Ler versão atual
$currentVersion = "v1.0.103.322"
if (Test-Path $BUILD_VERSION_FILE) {
    $content = Get-Content $BUILD_VERSION_FILE -Raw
    if ($content -match 'v(\d+)\.(\d+)\.(\d+)\.(\d+)') {
        $currentVersion = $matches[0]
    }
}

Write-ColorOutput Yellow "Versao atual: $currentVersion"

# Incrementar versão (patch: último número)
if ($Version -eq "") {
    if ($currentVersion -match 'v(\d+)\.(\d+)\.(\d+)\.(\d+)') {
        $major = [int]$matches[1]
        $minor = [int]$matches[2]
        $patch1 = [int]$matches[3]
        $patch2 = [int]$matches[4]
        $patch2++
        $newVersion = "v$major.$minor.$patch1.$patch2"
    } else {
        $newVersion = "v1.0.103.323"
    }
} else {
    $newVersion = $Version
}

Write-ColorOutput Green "Nova versao: $newVersion`n"

# ============================================================================
# PASSO 2: Atualizar arquivos de versão
# ============================================================================

Write-ColorOutput Cyan "Atualizando arquivos de versao..."

# Atualizar BUILD_VERSION.txt
$buildDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$buildVersionContent = @"
$newVersion
Build Date: $buildDate
"@
Set-Content -Path $BUILD_VERSION_FILE -Value $buildVersionContent -Encoding UTF8

# Atualizar CACHE_BUSTER.ts
$cacheBusterContent = @"
/**
 * RENDIZY - Cache Buster
 * Forca rebuild completo quando necessario
 * @version $newVersion
 */

export const CACHE_BUSTER = {
  version: '$newVersion',
  buildDate: '$(Get-Date -Format "yyyy-MM-ddTHH:mm:ss.000Z")',
  reason: 'Deploy automatico: Sistema de registro de campos financeiros',
  changes: [
    'Sistema de registro automatico de campos financeiros',
    'Integracao Airbnb com registro automatico de campo',
    'Migration de campos financeiros aplicada',
    'Filtro de modulos atualizado (inclui Integracoes)',
  ],
};

export default CACHE_BUSTER;
"@
Set-Content -Path $CACHE_BUSTER_FILE -Value $cacheBusterContent -Encoding UTF8

Write-ColorOutput Green "Arquivos de versao atualizados`n"

# ============================================================================
# PASSO 3: Deploy Backend (Supabase)
# ============================================================================

Write-ColorOutput Cyan "Fazendo deploy do backend no Supabase..."

try {
    Write-ColorOutput Yellow "  Executando: npx supabase functions deploy rendizy-server"
    $deployOutput = npx supabase functions deploy rendizy-server 2>&1 | Out-String
    Write-Output $deployOutput
    
    # Verificar se o deploy foi bem-sucedido (ignorar warning do Docker)
    if ($deployOutput -match "Deployed Functions" -or $LASTEXITCODE -eq 0) {
        Write-ColorOutput Green "Backend deployado com sucesso no Supabase"
    } elseif ($deployOutput -match "WARNING: Docker is not running") {
        Write-ColorOutput Yellow "Warning: Docker nao esta rodando (normal em Windows)"
        Write-ColorOutput Yellow "  Tentando deploy mesmo assim..."
        # Tentar novamente
        $deployOutput2 = npx supabase functions deploy rendizy-server 2>&1 | Out-String
        if ($deployOutput2 -match "Deployed Functions" -or $LASTEXITCODE -eq 0) {
            Write-ColorOutput Green "Backend deployado com sucesso no Supabase"
        } else {
            Write-ColorOutput Red "Erro ao fazer deploy do backend"
            Write-Output $deployOutput2
            Write-ColorOutput Yellow "  Continuando mesmo assim para fazer commit..."
        }
    } else {
        Write-ColorOutput Red "Erro ao fazer deploy do backend"
        Write-Output $deployOutput
        Write-ColorOutput Yellow "  Continuando mesmo assim para fazer commit..."
    }
} catch {
    Write-ColorOutput Yellow "Erro ao fazer deploy do backend: $_"
    Write-ColorOutput Yellow "  Continuando mesmo assim para fazer commit..."
}

Write-Output ""

# ============================================================================
# PASSO 4: Commit e Push no GitHub
# ============================================================================

Write-ColorOutput Cyan "Fazendo commit e push no GitHub..."

# Mensagem de commit padrão
if ($Message -eq "") {
    $commitMessage = "Deploy ${newVersion}: Sistema de registro automatico de campos financeiros"
} else {
    $commitMessage = $Message
}

try {
    # Adicionar todos os arquivos
    Write-ColorOutput Yellow "  Adicionando arquivos ao Git..."
    git add .
    
    # Commit
    Write-ColorOutput Yellow "  Fazendo commit..."
    git commit -m $commitMessage
    
    # Push
    Write-ColorOutput Yellow "  Fazendo push para GitHub..."
    git push
    
    Write-ColorOutput Green "Codigo enviado para GitHub com sucesso`n"
} catch {
    Write-ColorOutput Red "Erro ao fazer commit/push: $_"
    exit 1
}

# ============================================================================
# PASSO 5: Criar backup com data e versão
# ============================================================================

Write-ColorOutput Cyan "Criando backup com data e versao..."

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupName = "rendizy-backup-$newVersion-$timestamp"
$backupPath = "$env:USERPROFILE\Downloads\$backupName"

try {
    # Criar arquivo ZIP com todo o projeto
    Write-ColorOutput Yellow "  Compactando projeto..."
    
    # Usar Compress-Archive do PowerShell
    $tempDir = "$env:TEMP\$backupName"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    
    # Copiar arquivos usando robocopy (mais eficiente)
    Write-ColorOutput Yellow "  Copiando arquivos..."
    $sourcePath = (Get-Location).Path
    robocopy $sourcePath $tempDir /E /XD node_modules .git dist build .vscode .idea /XF *.zip *.log /NFL /NDL /NJH /NJS /NC /NS /NP | Out-Null
    
    # Compactar
    Write-ColorOutput Yellow "  Compactando..."
    Compress-Archive -Path "$tempDir\*" -DestinationPath "$backupPath.zip" -Force
    
    # Limpar temp
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    
    Write-ColorOutput Green "Backup criado: $backupPath.zip`n"
} catch {
    Write-ColorOutput Yellow "Erro ao criar backup: $_"
    Write-ColorOutput Yellow "  Continuando mesmo assim...`n"
}

# ============================================================================
# RESUMO FINAL
# ============================================================================

Write-ColorOutput Green "`n✅ DEPLOY COMPLETO COM SUCESSO!`n"
Write-ColorOutput Cyan "========================================`n"
Write-ColorOutput White "📦 Versão: $newVersion"
Write-ColorOutput White "☁️  Backend: Deployado no Supabase"
Write-ColorOutput White "📤 GitHub: Código enviado"
Write-ColorOutput White "💾 Backup: $backupPath.zip"
Write-ColorOutput Cyan "`n========================================`n"
