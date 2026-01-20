# ============================================================================
# SCRIPT: Testar Logs do Supabase via CLI (npx)
# ============================================================================

$ProjectRef = "odcgnzfremrqnvtitpcc"

Write-Host "🔍 Testando logs do Supabase via CLI..." -ForegroundColor Cyan
Write-Host "   Project Ref: $ProjectRef" -ForegroundColor Gray
Write-Host ""

# Testar versão
Write-Host "📋 Versão do CLI:" -ForegroundColor Yellow
npx --yes supabase --version
Write-Host ""

# Testar se está logado
Write-Host "📋 Status de autenticação:" -ForegroundColor Yellow
npx --yes supabase projects list 2>&1 | Select-Object -First 5
Write-Host ""

# Se não estiver logado, mostrar instruções
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ Você precisa fazer login primeiro:" -ForegroundColor Yellow
    Write-Host "   npx supabase login" -ForegroundColor White
    Write-Host ""
}

Write-Host "📋 Para ver logs:" -ForegroundColor Yellow
Write-Host "   npx supabase logs --project-ref $ProjectRef" -ForegroundColor White
Write-Host ""

