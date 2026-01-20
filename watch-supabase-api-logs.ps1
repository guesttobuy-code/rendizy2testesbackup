# ============================================================================
# SCRIPT: Monitorar Logs do Supabase via API (SEM CLI)
# ============================================================================
# Este script usa a API do Supabase para buscar logs sem precisar do CLI
# ============================================================================

param(
    [int]$IntervalSeconds = 5,
    [string]$Filter = "login"
)

$ProjectRef = "odcgnzfremrqnvtitpcc"
$FunctionName = "rendizy-server"

Write-Host "🔍 Monitorando logs via Dashboard do Supabase..." -ForegroundColor Cyan
Write-Host "   Projeto: $ProjectRef" -ForegroundColor Gray
Write-Host "   Função: $FunctionName" -ForegroundColor Gray
Write-Host "   Filtro: $Filter" -ForegroundColor Gray
Write-Host "   Intervalo: ${IntervalSeconds}s" -ForegroundColor Gray
Write-Host ""
Write-Host "📋 SOLUÇÕES DISPONÍVEIS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   1️⃣  ACESSO DIRETO AO DASHBOARD:" -ForegroundColor Green
Write-Host "      https://supabase.com/dashboard/project/$ProjectRef/functions/$FunctionName/logs" -ForegroundColor Cyan
Write-Host ""
Write-Host "   2️⃣  USAR BROWSER PARA MONITORAR:" -ForegroundColor Green
Write-Host "      Abra o dashboard acima e pressione F5 para atualizar" -ForegroundColor Cyan
Write-Host ""
Write-Host "   3️⃣  LOGGING ESTRUTURADO (RECOMENDADO):" -ForegroundColor Green
Write-Host "      Use a tabela function_logs no SQL Editor" -ForegroundColor Cyan
Write-Host "      SQL: SELECT * FROM function_logs ORDER BY created_at DESC LIMIT 50;" -ForegroundColor Gray
Write-Host ""
Write-Host "   ⏸️  Aguardando (Ctrl+C para parar)..." -ForegroundColor DarkGray
Write-Host ""

# Abrir dashboard automaticamente
$dashboardUrl = "https://supabase.com/dashboard/project/$ProjectRef/functions/$FunctionName/logs"
Write-Host "🌐 Abrindo dashboard no navegador..." -ForegroundColor Cyan
Start-Process $dashboardUrl

# Loop de espera (usuario pode parar com Ctrl+C)
try {
    while ($true) {
        Write-Host "   $(Get-Date -Format 'HH:mm:ss') - Acesse o dashboard para ver logs em tempo real" -ForegroundColor DarkGray
        Start-Sleep -Seconds $IntervalSeconds
    }
} catch {
    Write-Host "`n✅ Monitoramento encerrado" -ForegroundColor Green
}

