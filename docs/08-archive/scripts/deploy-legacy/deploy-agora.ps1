# 🛡️ DEPLOY COM VERIFICAÇÃO DE CONFLITOS
# ⚠️ ATUALIZADO: Agora verifica conflitos antes de fazer deploy

Write-Host "`n=== DEPLOY RENDIZY-SERVER (COM VERIFICAÇÃO) ===" -ForegroundColor Green
Write-Host ""

# Navegar para o diretório oficial
# Set-Location "C:\dev\RENDIZY PASTA OFICIAL"
Write-Host "Diretorio atual: $PWD"

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
        Write-Host "  .\deploy-agora.ps1" -ForegroundColor White
        Write-Host ""
        exit 1
    }
}
else {
    Write-Host "⚠️  Script de verificação não encontrado. Continuando sem verificação..." -ForegroundColor Yellow
    Write-Host ""
}

# PASSO 2: DEPLOY
Write-Host "✅ Nenhum conflito encontrado. Fazendo deploy..." -ForegroundColor Green
Write-Host ""

& npx supabase functions deploy rendizy-server --no-verify-jwt

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ DEPLOY CONCLUÍDO!" -ForegroundColor Green
    Write-Host "`nA rota /chat/channels/config está disponível em:" -ForegroundColor Cyan
    Write-Host "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/chat/channels/config" -ForegroundColor White
}
else {
    Write-Host "`n❌ ERRO NO DEPLOY" -ForegroundColor Red
    Write-Host "Verifique se está logado: npx supabase login" -ForegroundColor Yellow
}

Write-Host ""
