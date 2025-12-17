# ============================================================================
# CAPTURAR OUTPUTS DO POWERSHELL
# ============================================================================
# Use este script para capturar todos os outputs de comandos futuros
# ============================================================================

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$logFile = "outputs_$timestamp.txt"

Write-Host "📝 Iniciando captura de outputs..." -ForegroundColor Cyan
Write-Host "   Arquivo: $logFile" -ForegroundColor Yellow
Write-Host ""
Write-Host "✅ Todos os outputs serão salvos em: $logFile" -ForegroundColor Green
Write-Host "   Execute seus comandos normalmente." -ForegroundColor Green
Write-Host "   Para parar, execute: Stop-Transcript" -ForegroundColor Yellow
Write-Host ""

# Iniciar transcript
Start-Transcript -Path $logFile -Append

Write-Host "🎯 Captura iniciada! Execute seus comandos agora..." -ForegroundColor Green
Write-Host ""
