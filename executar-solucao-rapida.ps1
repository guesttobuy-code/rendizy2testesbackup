# ============================================================================
# Script Rápido - Fazer Login Funcionar
# Data: 2024-11-21
# ============================================================================

Write-Host "⚡ SOLUÇÃO RÁPIDA - FAZER LOGIN FUNCIONAR" -ForegroundColor Cyan
Write-Host ""

$projectId = "odcgnzfremrqnvtitpcc"

Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1️⃣ APLICAR MIGRATIONS (2 minutos)" -ForegroundColor Green
Write-Host "   → Abra: https://supabase.com/dashboard/project/$projectId/sql" -ForegroundColor White
Write-Host "   → Abra arquivo: APLICAR_MIGRATIONS_COMPLETAS.sql" -ForegroundColor White
Write-Host "   → Cole no SQL Editor e execute (Run)" -ForegroundColor White
Write-Host ""
Write-Host "2️⃣ DEPLOY EDGE FUNCTION (2 minutos)" -ForegroundColor Green
Write-Host "   → Abra: https://supabase.com/dashboard/project/$projectId/functions" -ForegroundColor White
Write-Host "   → Redeploy da função rendizy-server" -ForegroundColor White
Write-Host ""
Write-Host "3️⃣ TESTAR LOGIN (1 minuto)" -ForegroundColor Green
Write-Host "   → Abra: https://rendizy2producao-am7c.vercel.app/login" -ForegroundColor White
Write-Host "   → Usuário: rppt / Senha: root" -ForegroundColor White
Write-Host ""
Write-Host "⏱️ Tempo total: ~5 minutos" -ForegroundColor Yellow
Write-Host ""

# Verificar se arquivo de migration existe
$migrationFile = "APLICAR_MIGRATIONS_COMPLETAS.sql"
if (Test-Path $migrationFile) {
    Write-Host "✅ Arquivo de migration encontrado: $migrationFile" -ForegroundColor Green
    $content = Get-Content $migrationFile -Raw
    $lines = ($content -split "`n").Count
    Write-Host "   Total de linhas: $lines" -ForegroundColor Gray
} else {
    Write-Host "❌ Arquivo de migration NÃO encontrado: $migrationFile" -ForegroundColor Red
}

Write-Host ""
Write-Host "🚀 Abrindo arquivo de migration..." -ForegroundColor Cyan
Start-Process notepad.exe $migrationFile

Write-Host ""
Write-Host "✅ Pronto! Siga os passos acima." -ForegroundColor Green

