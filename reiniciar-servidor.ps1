# Script para reiniciar o servidor Vite
Set-Location "C:\dev\RENDIZY PASTA OFICIAL\RendizyPrincipal"

Write-Host "🛑 Parando processos Node/Vite..." -ForegroundColor Yellow

# Tenta parar processos Node na porta 5173
$port = 5173
$processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($processes) {
    foreach ($processId in $processes) {
        try {
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Write-Host "   ✅ Processo $processId finalizado" -ForegroundColor Green
        } catch {
            Write-Host "   ⚠️  Não foi possível finalizar processo $processId" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "   ℹ️  Nenhum processo encontrado na porta $port" -ForegroundColor Cyan
}

# Aguarda um momento
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "🚀 Reiniciando servidor Vite..." -ForegroundColor Green
Write-Host "📁 Diretório: $(Get-Location)" -ForegroundColor Cyan
Write-Host ""

npm run dev
