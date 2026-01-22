# Script para reiniciar o servidor Vite
# Usa a pasta onde este script está localizado
Set-Location $PSScriptRoot

Write-Host "🛑 Parando processos Node/Vite..." -ForegroundColor Yellow

# Tenta parar processos Node nas portas 3000 e 5173
$ports = @(3000, 5173)
foreach ($port in $ports) {
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
    if ($processes) {
        foreach ($processId in $processes) {
            try {
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                Write-Host "   ✅ Processo $processId finalizado (porta $port)" -ForegroundColor Green
            } catch {
                Write-Host "   ⚠️  Não foi possível finalizar processo $processId (porta $port)" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "   ℹ️  Nenhum processo encontrado na porta $port" -ForegroundColor Cyan
    }
}

# Aguarda um momento
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "🚀 Reiniciando servidor Vite..." -ForegroundColor Green
Write-Host "📁 Diretório: $(Get-Location)" -ForegroundColor Cyan
Write-Host ""

npm run dev
