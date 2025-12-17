# ============================================================================
# VER OUTPUTS CAPTURADOS
# ============================================================================
# Mostra os últimos arquivos de output capturados
# ============================================================================

Write-Host "📋 ARQUIVOS DE OUTPUT CAPTURADOS:" -ForegroundColor Cyan
Write-Host ""

$outputFiles = Get-ChildItem -Path . -Filter "outputs_*.txt" | Sort-Object LastWriteTime -Descending | Select-Object -First 5

if ($outputFiles) {
    Write-Host "Últimos arquivos encontrados:" -ForegroundColor Yellow
    Write-Host ""
    
    foreach ($file in $outputFiles) {
        Write-Host "📄 $($file.Name)" -ForegroundColor White
        Write-Host "   Criado: $($file.LastWriteTime)" -ForegroundColor Gray
        Write-Host "   Tamanho: $([math]::Round($file.Length / 1KB, 2)) KB" -ForegroundColor Gray
        
        # Mostrar últimas 10 linhas
        Write-Host "   Últimas linhas:" -ForegroundColor Yellow
        Get-Content $file.FullName -Tail 10 | ForEach-Object {
            Write-Host "   $_" -ForegroundColor DarkGray
        }
        Write-Host ""
    }
    
    Write-Host "💡 Para ver um arquivo completo:" -ForegroundColor Yellow
    Write-Host "   Get-Content outputs_YYYYMMDD_HHMMSS.txt" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 Para ver o arquivo mais recente:" -ForegroundColor Yellow
    Write-Host "   Get-Content (Get-ChildItem outputs_*.txt | Sort-Object LastWriteTime -Descending | Select-Object -First 1)" -ForegroundColor White
} else {
    Write-Host "❌ Nenhum arquivo de output encontrado." -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Para capturar outputs futuros:" -ForegroundColor Yellow
    Write-Host "   .\capturar-outputs.ps1" -ForegroundColor White
    Write-Host "   # Execute seus comandos" -ForegroundColor Gray
    Write-Host "   Stop-Transcript" -ForegroundColor White
}
