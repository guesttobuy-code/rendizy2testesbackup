# ============================================================================
# SCRIPT: Abrir Dashboard de Logs do Supabase (Solução Prática)
# ============================================================================

param(
    [switch]$Watch = $false
)

$ProjectRef = "odcgnzfremrqnvtitpcc"
$FunctionName = "rendizy-server"

$DashboardUrl = "https://supabase.com/dashboard/project/$ProjectRef/functions/$FunctionName/logs"
$SQLEditorUrl = "https://supabase.com/dashboard/project/$ProjectRef/sql/new"

Write-Host "🔍 Abrindo Dashboard de Logs do Supabase..." -ForegroundColor Cyan
Write-Host ""
Write-Host "   📊 Dashboard de Logs:" -ForegroundColor Yellow
Write-Host "      $DashboardUrl" -ForegroundColor White
Write-Host ""
Write-Host "   📋 SQL Editor:" -ForegroundColor Yellow
Write-Host "      $SQLEditorUrl" -ForegroundColor White
Write-Host ""

# Abrir dashboard
Start-Process $DashboardUrl

Write-Host "✅ Dashboard aberto no navegador!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 QUERIES ÚTEIS PARA COLEAR NO SQL EDITOR:" -ForegroundColor Cyan
Write-Host ""
Write-Host "-- Ver últimos erros de login" -ForegroundColor Gray
Write-Host "SELECT * FROM function_logs" -ForegroundColor White
Write-Host "WHERE function_name LIKE '%auth/login%'" -ForegroundColor White
Write-Host "  AND level = 'error'" -ForegroundColor White
Write-Host "  AND created_at > NOW() - INTERVAL '2 hours'" -ForegroundColor White
Write-Host "ORDER BY created_at DESC" -ForegroundColor White
Write-Host "LIMIT 50;" -ForegroundColor White
Write-Host ""

if ($Watch) {
    Write-Host "🔄 Modo Watch: Atualizando página a cada 10 segundos..." -ForegroundColor Yellow
    Write-Host "   Pressione Ctrl+C para parar`n" -ForegroundColor Gray
    
    while ($true) {
        Start-Sleep -Seconds 10
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Pressione F5 no navegador para atualizar os logs" -ForegroundColor DarkGray
    }
}

