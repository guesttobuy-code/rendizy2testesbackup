# Script para criar ZIP apenas com arquivos do frontend modificados
$zipName = "Rendizy-frontend-updates_$(Get-Date -Format 'yyyy-MM-dd_HH-mm').zip"

# Arquivos importantes modificados
$files = @(
    "src\utils\services\evolutionService.ts",
    "src\components\WhatsAppIntegration.tsx",
    "src\components\WhatsAppFloatingButton.tsx"
)

# Verificar quais arquivos existem
$existingFiles = @()
foreach ($file in $files) {
    if (Test-Path $file) {
        $existingFiles += $file
        Write-Host "✓ Encontrado: $file" -ForegroundColor Green
    } else {
        Write-Host "✗ Não encontrado: $file" -ForegroundColor Red
    }
}

if ($existingFiles.Count -eq 0) {
    Write-Host "`n❌ Nenhum arquivo encontrado!" -ForegroundColor Red
    exit 1
}

Write-Host "`n📦 Criando ZIP..." -ForegroundColor Cyan

# Remover ZIP anterior se existir
if (Test-Path $zipName) {
    Remove-Item $zipName -Force
    Write-Host "🗑️  ZIP anterior removido" -ForegroundColor Yellow
}

# Criar diretório temporário
$tempDir = Join-Path $env:TEMP "rendizy_zip_$(Get-Date -Format 'yyyyMMddHHmmss')"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Copiar arquivos mantendo estrutura de diretórios
foreach ($file in $existingFiles) {
    $destPath = Join-Path $tempDir $file
    $destDir = Split-Path $destPath -Parent
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    Copy-Item -Path $file -Destination $destPath -Force
    Write-Host "  ✓ Copiado: $file" -ForegroundColor Gray
}

# Criar ZIP
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipName -Force

# Limpar diretório temporário
Remove-Item -Path $tempDir -Recurse -Force

# Mostrar resultado
$size = (Get-Item $zipName).Length / 1KB
Write-Host "`n✅ ZIP criado com sucesso!" -ForegroundColor Green
Write-Host "   Nome: $zipName" -ForegroundColor White
Write-Host "   Arquivos: $($existingFiles.Count)" -ForegroundColor White
Write-Host "   Tamanho: $([math]::Round($size, 2)) KB" -ForegroundColor White
Write-Host "`n📋 Arquivos incluídos:" -ForegroundColor Cyan
foreach ($file in $existingFiles) {
    Write-Host "   • $file" -ForegroundColor Yellow
}

