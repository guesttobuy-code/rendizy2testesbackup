# 🛡️ Script Alternativo - Usa npx ao invés de supabase CLI global
# ⚠️ ATUALIZADO: Agora verifica conflitos antes de fazer deploy

Write-Host "`n=== DEPLOY SUPABASE (COM VERIFICAÇÃO) ===" -ForegroundColor Green
Write-Host ""

$projectPath = "C:\dev\RENDIZY PASTA OFICIAL"
$supabasePath = Join-Path $projectPath "supabase"

if (-not (Test-Path $supabasePath)) {
    Write-Host "Erro: Pasta supabase nao encontrada!" -ForegroundColor Red
    exit 1
}

# PASSO 1: VERIFICAR CONFLITOS (OBRIGATÓRIO)
Write-Host "🔍 Verificando conflitos de merge..." -ForegroundColor Cyan
Write-Host ""

$verifyScript = Join-Path $projectPath "verificar-antes-deploy.ps1"
if (Test-Path $verifyScript) {
    Set-Location $projectPath
    & $verifyScript
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "🚨 ERRO: CONFLITOS DE MERGE DETECTADOS!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Execute para corrigir:" -ForegroundColor Yellow
        Write-Host "  .\resolver-todos-conflitos-definitivo.ps1" -ForegroundColor White
        Write-Host ""
        exit 1
    }
} else {
    Write-Host "⚠️  Script de verificação não encontrado. Continuando sem verificação..." -ForegroundColor Yellow
    Write-Host ""
}

# PASSO 2: DEPLOY
Set-Location $supabasePath
Write-Host "Diretorio: $(Get-Location)" -ForegroundColor Green
Write-Host ""

Write-Host "✅ Nenhum conflito encontrado. Executando deploy via npx..." -ForegroundColor Green
Write-Host ""

npx supabase functions deploy rendizy-server --no-verify-jwt

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Deploy concluido com sucesso!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Erro durante o deploy." -ForegroundColor Red
    exit 1
}

Set-Location $projectPath
