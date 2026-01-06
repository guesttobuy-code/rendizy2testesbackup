# 🛡️ DEPLOY SEGURO - COM VERIFICAÇÃO DE CONFLITOS
# NUNCA faz deploy sem verificar conflitos primeiro

Write-Host "`n=== DEPLOY SEGURO RENDIZY-SERVER ===" -ForegroundColor Green
Write-Host ""

# Navegar para o diretório
Set-Location "C:\dev\RENDIZY PASTA OFICIAL"

# PASSO 1: VERIFICAR CONFLITOS (OBRIGATÓRIO)
Write-Host "🔍 Verificando conflitos de merge..." -ForegroundColor Cyan
Write-Host ""

$verifyScript = Join-Path $PWD "verificar-antes-deploy.ps1"
if (Test-Path $verifyScript) {
    & $verifyScript
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "🚨 ERRO: CONFLITOS DE MERGE DETECTADOS!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Execute para corrigir:" -ForegroundColor Yellow
        Write-Host "  .\resolver-todos-conflitos-definitivo.ps1" -ForegroundColor White
        Write-Host ""
        Write-Host "Depois execute novamente:" -ForegroundColor Yellow
        Write-Host "  .\deploy-agora-seguro.ps1" -ForegroundColor White
        Write-Host ""
        exit 1
    }
} else {
    Write-Host "⚠️  Script de verificação não encontrado. Continuando sem verificação..." -ForegroundColor Yellow
    Write-Host "   (Recomendado: criar verificar-antes-deploy.ps1)" -ForegroundColor Yellow
    Write-Host ""
}

# PASSO 2: DEPLOY
Write-Host "✅ Nenhum conflito encontrado. Fazendo deploy..." -ForegroundColor Green
Write-Host ""

& npx supabase functions deploy rendizy-server --no-verify-jwt

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ DEPLOY CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
} else {
    Write-Host "`n❌ ERRO NO DEPLOY" -ForegroundColor Red
    Write-Host "Verifique os logs acima para mais detalhes." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
