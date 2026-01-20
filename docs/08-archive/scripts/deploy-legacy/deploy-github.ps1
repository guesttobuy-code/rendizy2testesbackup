# ============================================================================
# DEPLOY COMPLETO: GIT + GITHUB + SUPABASE
# ============================================================================
# Este script faz commit, push no GitHub e deploy no Supabase
# ============================================================================

param(
    [string]$CommitMessage = "",
    [switch]$SkipDeploy = $false
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOY COMPLETO - GITHUB + SUPABASE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# PASSO 1: Verificar se está no diretório correto
# ============================================================================
Write-Host "[1/5] Verificando diretório..." -ForegroundColor Yellow

if (-not (Test-Path ".git")) {
    Write-Host "ERRO: Nao esta em um repositorio Git!" -ForegroundColor Red
    exit 1
}

$currentBranch = git branch --show-current
Write-Host "Branch atual: $currentBranch" -ForegroundColor Green
Write-Host ""

# ============================================================================
# PASSO 2: Verificar status do Git
# ============================================================================
Write-Host "[2/5] Verificando status do Git..." -ForegroundColor Yellow

$status = git status --porcelain
if (-not $status) {
    Write-Host "Nenhuma alteracao para commitar." -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "Arquivos modificados:" -ForegroundColor Cyan
    git status --short
    Write-Host ""
}

# ============================================================================
# PASSO 3: Adicionar arquivos
# ============================================================================
Write-Host "[3/5] Adicionando arquivos ao staging..." -ForegroundColor Yellow

try {
    git add -A
    Write-Host "Arquivos adicionados com sucesso!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "ERRO ao adicionar arquivos: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================================================
# PASSO 4: Fazer commit
# ============================================================================
Write-Host "[4/5] Fazendo commit..." -ForegroundColor Yellow

if (-not $CommitMessage) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $CommitMessage = "feat: atualizacao automatica - $timestamp"
}

try {
    git commit -m $CommitMessage
    Write-Host "Commit realizado com sucesso!" -ForegroundColor Green
    Write-Host "Mensagem: $CommitMessage" -ForegroundColor Cyan
    Write-Host ""
} catch {
    $errorMsg = $_.Exception.Message
    if ($errorMsg -match "nothing to commit") {
        Write-Host "Nada para commitar (tudo ja esta commitado)." -ForegroundColor Yellow
        Write-Host ""
    } else {
        Write-Host "ERRO ao fazer commit: $errorMsg" -ForegroundColor Red
        exit 1
    }
}

# ============================================================================
# PASSO 5: Push para GitHub
# ============================================================================
Write-Host "[5/5] Fazendo push para GitHub..." -ForegroundColor Yellow

try {
    $remote = git remote get-url origin
    Write-Host "Remote: $remote" -ForegroundColor Cyan
    
    git push origin $currentBranch
    Write-Host ""
    Write-Host "Push realizado com sucesso!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "ERRO ao fazer push: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Tentando push forçado? (y/n): " -ForegroundColor Yellow -NoNewline
    $response = Read-Host
    if ($response -eq "y" -or $response -eq "Y") {
        Write-Host "Fazendo push forçado..." -ForegroundColor Yellow
        git push origin $currentBranch --force
        Write-Host "Push forçado realizado!" -ForegroundColor Green
    } else {
        Write-Host "Push cancelado." -ForegroundColor Yellow
        exit 1
    }
}

# ============================================================================
# PASSO 6: Deploy no Supabase (opcional)
# ============================================================================
if (-not $SkipDeploy) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  DEPLOY NO SUPABASE" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "Deseja fazer deploy no Supabase? (y/n): " -ForegroundColor Yellow -NoNewline
    $deployResponse = Read-Host
    
    if ($deployResponse -eq "y" -or $deployResponse -eq "Y") {
        Write-Host ""
        Write-Host "Fazendo deploy das Edge Functions..." -ForegroundColor Yellow
        
        try {
            # Verificar métodos disponíveis
            $supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue
            $npxInstalled = Get-Command npx -ErrorAction SilentlyContinue
            
            if ($supabaseInstalled) {
                Write-Host "Usando Supabase CLI..." -ForegroundColor Cyan
                supabase functions deploy rendizy-server
            } elseif ($npxInstalled) {
                Write-Host "Usando npx (nao precisa instalar CLI)..." -ForegroundColor Cyan
                npx supabase functions deploy rendizy-server
            } else {
                Write-Host "ERRO: Supabase CLI ou npx nao encontrado!" -ForegroundColor Red
                Write-Host ""
                Write-Host "Opcoes:" -ForegroundColor Yellow
                Write-Host "  1. Instalar CLI: npm install -g supabase" -ForegroundColor White
                Write-Host "  2. Deploy via Dashboard:" -ForegroundColor White
                Write-Host "     https://supabase.com/dashboard/project/odcgnzfremrqnvtitpcc/functions" -ForegroundColor Cyan
                Write-Host "  3. Instalar Node.js para usar npx" -ForegroundColor White
            }
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "Deploy no Supabase realizado com sucesso!" -ForegroundColor Green
            }
        } catch {
            Write-Host "ERRO ao fazer deploy no Supabase: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "Voce pode fazer deploy manualmente depois." -ForegroundColor Yellow
        }
    } else {
        Write-Host "Deploy no Supabase cancelado." -ForegroundColor Yellow
    }
}

# ============================================================================
# RESUMO FINAL
# ============================================================================
Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DEPLOY CONCLUIDO COM SUCESSO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Resumo:" -ForegroundColor Cyan
Write-Host "  - Commit: $CommitMessage" -ForegroundColor White
Write-Host "  - Branch: $currentBranch" -ForegroundColor White
Write-Host "  - Push: GitHub" -ForegroundColor White
if (-not $SkipDeploy) {
    Write-Host "  - Deploy: Supabase (se executado)" -ForegroundColor White
}
Write-Host ""
