# Script para atualizar todos os caminhos do OneDrive para C:\dev
Write-Host "=== ATUALIZANDO CAMINHOS DO PROJETO ===" -ForegroundColor Cyan
Write-Host ""

$projectPath = "C:\dev\RENDIZY PASTA OFICIAL"
$oldPath = "C:\Users\rafae\OneDrive\Desktop\RENDIZY PASTA OFICIAL"
$newPath = "C:\dev\RENDIZY PASTA OFICIAL"

Write-Host "Caminho antigo: $oldPath" -ForegroundColor Yellow
Write-Host "Caminho novo:  $newPath" -ForegroundColor Green
Write-Host ""

# Lista de arquivos para atualizar
$filesToUpdate = @(
    "Ligando os motores.md",
    "iniciar-servidor.ps1",
    "reiniciar-servidor.ps1",
    "README.md"
)

# Atualizar arquivos .ps1
Write-Host "Atualizando scripts PowerShell..." -ForegroundColor Cyan
$ps1Files = Get-ChildItem -Path $projectPath -Recurse -Filter "*.ps1" -File
$updatedCount = 0

foreach ($file in $ps1Files) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -and $content -match [regex]::Escape($oldPath)) {
        $newContent = $content -replace [regex]::Escape($oldPath), $newPath
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        Write-Host "  ✅ $($file.Name)" -ForegroundColor Green
        $updatedCount++
    }
}

Write-Host ""
Write-Host "Scripts atualizados: $updatedCount" -ForegroundColor Green

# Atualizar arquivos .md
Write-Host ""
Write-Host "Atualizando documentos Markdown..." -ForegroundColor Cyan
$mdFiles = Get-ChildItem -Path $projectPath -Recurse -Filter "*.md" -File
$mdUpdatedCount = 0

foreach ($file in $mdFiles) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -and $content -match [regex]::Escape($oldPath)) {
        $newContent = $content -replace [regex]::Escape($oldPath), $newPath
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        Write-Host "  ✅ $($file.Name)" -ForegroundColor Green
        $mdUpdatedCount++
    }
}

Write-Host ""
Write-Host "Documentos atualizados: $mdUpdatedCount" -ForegroundColor Green

# Atualizar arquivos .txt
Write-Host ""
Write-Host "Atualizando arquivos de texto..." -ForegroundColor Cyan
$txtFiles = Get-ChildItem -Path $projectPath -Recurse -Filter "*.txt" -File
$txtUpdatedCount = 0

foreach ($file in $txtFiles) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if ($content -and $content -match [regex]::Escape($oldPath)) {
        $newContent = $content -replace [regex]::Escape($oldPath), $newPath
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        Write-Host "  ✅ $($file.Name)" -ForegroundColor Green
        $txtUpdatedCount++
    }
}

Write-Host ""
Write-Host "Arquivos de texto atualizados: $txtUpdatedCount" -ForegroundColor Green

Write-Host ""
Write-Host "=== RESUMO ===" -ForegroundColor Cyan
Write-Host "Scripts PowerShell: $updatedCount" -ForegroundColor White
Write-Host "Documentos Markdown: $mdUpdatedCount" -ForegroundColor White
Write-Host "Arquivos de texto: $txtUpdatedCount" -ForegroundColor White
Write-Host ""
Write-Host "✅ Atualização concluída!" -ForegroundColor Green
