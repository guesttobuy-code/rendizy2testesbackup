# Script para criar ZIP do backend corrigido
# PREFERENCIA DO USUARIO: Sempre salvar ZIPs na pasta Downloads
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$zipName = "rendizy-backend-corrigido-$timestamp.zip"
$backendPath = "supabase/functions/rendizy-server"
$downloadsPath = "$env:USERPROFILE\Downloads"
$zipPath = Join-Path $downloadsPath $zipName

Write-Host "Criando ZIP do backend corrigido..." -ForegroundColor Cyan
Write-Host "Destino: $downloadsPath" -ForegroundColor Gray

if (Test-Path $backendPath) {
    Compress-Archive -Path $backendPath -DestinationPath $zipPath -Force
    $zipFile = Get-Item $zipPath
    Write-Host "ZIP criado com sucesso!" -ForegroundColor Green
    Write-Host "Arquivo: $zipName" -ForegroundColor Yellow
    Write-Host "Localizacao: $downloadsPath" -ForegroundColor Yellow
    Write-Host "Tamanho: $([math]::Round($zipFile.Length / 1MB, 2)) MB" -ForegroundColor Yellow
    Write-Host "Data: $($zipFile.LastWriteTime)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Pronto para fazer push no GitHub!" -ForegroundColor Green
} else {
    Write-Host "Erro: Pasta nao encontrada: $backendPath" -ForegroundColor Red
    exit 1
}

