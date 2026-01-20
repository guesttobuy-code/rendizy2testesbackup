# 🛡️ GIT PULL SEGURO - COM VERIFICAÇÃO DE CONFLITOS
# NUNCA faz git pull sem verificar conflitos primeiro

Write-Host "`n=== GIT PULL SEGURO ===" -ForegroundColor Green
Write-Host ""

# Navegar para o diretório
Set-Location "C:\dev\RENDIZY PASTA OFICIAL"

# PASSO 1: VERIFICAR CONFLITOS ANTES DE PULL (OBRIGATÓRIO)
Write-Host "🔍 Verificando conflitos de merge ANTES de fazer pull..." -ForegroundColor Cyan
Write-Host ""

$verifyScript = Join-Path $PWD "verificar-antes-deploy.ps1"
if (Test-Path $verifyScript) {
    & $verifyScript
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "🚨 ERRO: CONFLITOS DE MERGE DETECTADOS!" -ForegroundColor Red
        Write-Host ""
        Write-Host "⚠️  NÃO É POSSÍVEL FAZER PULL COM CONFLITOS!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Execute para corrigir:" -ForegroundColor Yellow
        Write-Host "  .\resolver-todos-conflitos-definitivo.ps1" -ForegroundColor White
        Write-Host ""
        Write-Host "Depois execute novamente:" -ForegroundColor Yellow
        Write-Host "  .\git-pull-seguro.ps1" -ForegroundColor White
        Write-Host ""
        exit 1
    }
} else {
    Write-Host "⚠️  Script de verificação não encontrado. Continuando sem verificação..." -ForegroundColor Yellow
    Write-Host "   (Recomendado: criar verificar-antes-deploy.ps1)" -ForegroundColor Yellow
    Write-Host ""
}

# PASSO 2: GIT PULL
Write-Host "✅ Nenhum conflito encontrado. Fazendo pull..." -ForegroundColor Green
Write-Host ""

git pull

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ PULL CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
    Write-Host ""
    
    # PASSO 3: VERIFICAR CONFLITOS DEPOIS DO PULL
    Write-Host "🔍 Verificando conflitos DEPOIS do pull..." -ForegroundColor Cyan
    Write-Host ""
    
    if (Test-Path $verifyScript) {
        & $verifyScript
        if ($LASTEXITCODE -ne 0) {
            Write-Host ""
            Write-Host "🚨 ATENÇÃO: CONFLITOS APARECERAM APÓS O PULL!" -ForegroundColor Red
            Write-Host ""
            Write-Host "Execute para corrigir:" -ForegroundColor Yellow
            Write-Host "  .\resolver-todos-conflitos-definitivo.ps1" -ForegroundColor White
            Write-Host ""
            exit 1
        } else {
            Write-Host "✅ Nenhum conflito após o pull!" -ForegroundColor Green
        }
    }
} else {
    Write-Host ""
    Write-Host "❌ ERRO NO PULL" -ForegroundColor Red
    Write-Host "Verifique os logs acima para mais detalhes." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
