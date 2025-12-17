# Script para criar ZIP dos arquivos do frontend modificados
# Sempre salva em: C:\Users\rafae\Downloads\

$downloadsPath = "C:\Users\rafae\Downloads"
$workingDir = Get-Location

Write-Host "📦 Criando ZIP dos arquivos do frontend..." -ForegroundColor Cyan
Write-Host "   Diretório de trabalho: $workingDir" -ForegroundColor Gray

# Arquivos importantes para incluir no ZIP
$files = @(
    'src/utils/services/evolutionService.ts',
    'src/components/WhatsAppIntegration.tsx',
    'src/components/WhatsAppFloatingButton.tsx',
    'RESUMO_CORRECOES_WHATSAPP.md'
)

# Verificar quais arquivos existem
$existing = @()
foreach ($file in $files) {
    $fullPath = Join-Path $workingDir $file
    if (Test-Path $fullPath) {
        $existing += $file
        Write-Host "   ✅ Encontrado: $file" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️ Não encontrado: $file" -ForegroundColor Yellow
    }
}

if ($existing.Count -eq 0) {
    Write-Host "`n❌ Nenhum arquivo encontrado para incluir no ZIP" -ForegroundColor Red
    exit 1
}

# Nome do arquivo ZIP com timestamp
$zipName = "frontend_whatsapp_update_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').zip"
$zipPath = Join-Path $downloadsPath $zipName

# Criar ZIP
Write-Host "`n📦 Criando ZIP..." -ForegroundColor Cyan
try {
    Compress-Archive -Path $existing -DestinationPath $zipPath -Force
    
    # Informações do arquivo criado
    $zipFile = Get-Item $zipPath
    $sizeKB = [math]::Round($zipFile.Length / 1KB, 2)
    $sizeMB = [math]::Round($zipFile.Length / 1MB, 2)
    
    Write-Host "`n✅ ZIP criado com sucesso!" -ForegroundColor Green
    Write-Host "   Local: $zipPath" -ForegroundColor White
    Write-Host "   Nome: $zipName" -ForegroundColor White
    Write-Host "   Tamanho: $sizeKB KB ($sizeMB MB)" -ForegroundColor White
    Write-Host "   Arquivos incluídos: $($existing.Count)" -ForegroundColor White
    
    Write-Host "`n📋 Arquivos no ZIP:" -ForegroundColor Cyan
    $existing | ForEach-Object { Write-Host "   - $_" -ForegroundColor Gray }
    
    Write-Host "`n💡 O arquivo foi salvo em: $downloadsPath" -ForegroundColor Yellow
    
} catch {
    Write-Host "`n❌ Erro ao criar ZIP: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
