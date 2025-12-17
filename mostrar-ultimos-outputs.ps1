# ============================================================================
# MOSTRAR ÚLTIMOS OUTPUTS DO POWERSHELL
# ============================================================================
# Script para mostrar os últimos comandos e outputs executados
# ============================================================================

Write-Host "📋 HISTÓRICO DE COMANDOS EXECUTADOS:" -ForegroundColor Cyan
Write-Host ""

# Mostrar últimos 20 comandos do histórico
$history = Get-History | Select-Object -Last 20
if ($history) {
    Write-Host "Últimos comandos executados:" -ForegroundColor Yellow
    $history | ForEach-Object {
        Write-Host "  [$($_.Id)] $($_.CommandLine)" -ForegroundColor Gray
    }
} else {
    Write-Host "Nenhum comando no histórico." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📝 ALTERNATIVAS PARA CAPTURAR OUTPUTS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Para capturar outputs futuros, use:" -ForegroundColor Yellow
Write-Host "   Start-Transcript -Path 'outputs.txt'" -ForegroundColor White
Write-Host "   # Execute seus comandos aqui" -ForegroundColor Gray
Write-Host "   Stop-Transcript" -ForegroundColor White
Write-Host ""
Write-Host "2. Para redirecionar output de um comando específico:" -ForegroundColor Yellow
Write-Host "   .\deploy-supabase.ps1 | Tee-Object -FilePath 'deploy-output.txt'" -ForegroundColor White
Write-Host ""
Write-Host "3. Para ver se há arquivos de log:" -ForegroundColor Yellow
Get-ChildItem -Path . -Filter "*.log" -ErrorAction SilentlyContinue | Select-Object -First 5 | ForEach-Object {
    Write-Host "   📄 $($_.Name) (Última modificação: $($_.LastWriteTime))" -ForegroundColor White
}

Write-Host ""
Write-Host "💡 DICA: Execute 'Start-Transcript' antes de rodar seus comandos" -ForegroundColor Green
Write-Host "   para capturar todos os outputs automaticamente!" -ForegroundColor Green
