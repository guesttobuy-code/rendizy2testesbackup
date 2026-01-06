<# 
.SYNOPSIS
Deploy Edge Function com validação prévia

.DESCRIPTION
Este script valida CORS e padrões de autenticação antes de fazer deploy
da Edge Function. Previne erros comuns em produção.

.PARAMETER FunctionName
Nome da Edge Function para deploy (ex: calendar-rules-batch)

.PARAMETER SkipValidation
Pular validação (não recomendado)

.PARAMETER ProjectRef
Project ref do Supabase (default: odcgnzfremrqnvtitpcc)

.EXAMPLE
.\scripts\deploy-edge-function.ps1 -FunctionName calendar-rules-batch
.\scripts\deploy-edge-function.ps1 -FunctionName rendizy-server -SkipValidation
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$FunctionName,
    
    [switch]$SkipValidation,
    
    [string]$ProjectRef = "odcgnzfremrqnvtitpcc"
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$functionsDir = Join-Path $repoRoot "supabase/functions"
$functionPath = Join-Path $functionsDir $FunctionName

Write-Host ""
Write-Host "🚀 DEPLOY EDGE FUNCTION: $FunctionName" -ForegroundColor Cyan
Write-Host ("=" * 60)
Write-Host ""

# Verificar se função existe
if (-not (Test-Path $functionPath)) {
    Write-Host "❌ Function não encontrada: $functionPath" -ForegroundColor Red
    exit 1
}

# ============================================================================
# STEP 1: VALIDAÇÃO
# ============================================================================

if (-not $SkipValidation) {
    Write-Host "📋 STEP 1: Validando Edge Function..." -ForegroundColor Yellow
    Write-Host ""
    
    $validateScript = Join-Path $repoRoot "scripts/validate-edge-functions.mjs"
    
    if (-not (Test-Path $validateScript)) {
        Write-Host "⚠️ Script de validação não encontrado, pulando..." -ForegroundColor Yellow
    } else {
        Push-Location $repoRoot
        try {
            node $validateScript $FunctionName
            if ($LASTEXITCODE -ne 0) {
                Write-Host ""
                Write-Host "❌ VALIDAÇÃO FALHOU!" -ForegroundColor Red
                Write-Host "   Corrija os erros acima antes do deploy." -ForegroundColor Red
                Write-Host ""
                Write-Host "   Para pular validação (não recomendado):" -ForegroundColor Yellow
                Write-Host "   .\scripts\deploy-edge-function.ps1 -FunctionName $FunctionName -SkipValidation" -ForegroundColor Gray
                Write-Host ""
                exit 1
            }
        } finally {
            Pop-Location
        }
    }
    
    Write-Host ""
} else {
    Write-Host "⚠️ SKIP: Validação pulada (não recomendado)" -ForegroundColor Yellow
    Write-Host ""
}

# ============================================================================
# STEP 2: DEPLOY
# ============================================================================

Write-Host "📋 STEP 2: Fazendo deploy para Supabase..." -ForegroundColor Yellow
Write-Host ""

Push-Location $repoRoot
try {
    $deployCmd = "npx -y supabase@latest functions deploy $FunctionName --project-ref $ProjectRef"
    Write-Host "   Comando: $deployCmd" -ForegroundColor Gray
    Write-Host ""
    
    Invoke-Expression $deployCmd
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "❌ DEPLOY FALHOU!" -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host ("=" * 60)
Write-Host "✅ DEPLOY CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
Write-Host ""
Write-Host "   Function: $FunctionName" -ForegroundColor White
Write-Host "   Project:  $ProjectRef" -ForegroundColor White
Write-Host ""
Write-Host "   Dashboard: https://supabase.com/dashboard/project/$ProjectRef/functions" -ForegroundColor Cyan
Write-Host ""
