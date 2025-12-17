# Script para criar ZIP completo do projeto (excluindo arquivos desnecessarios)
# SEMPRE salva em: C:\Users\rafae\Downloads\

$downloadsPath = "C:\Users\rafae\Downloads"
$workingDir = Get-Location
$projectName = Split-Path $workingDir -Leaf

Write-Host "Criando ZIP completo do projeto..." -ForegroundColor Cyan
Write-Host "   Diretorio: $workingDir" -ForegroundColor Gray
Write-Host "   Destino: $downloadsPath" -ForegroundColor Gray

# Nome do arquivo ZIP com timestamp
$zipName = "${projectName}_$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').zip"
$zipPath = Join-Path $downloadsPath $zipName

# Remover ZIP anterior se existir
if (Test-Path $zipPath) {
    Write-Host "   Removendo ZIP anterior..." -ForegroundColor Yellow
    Remove-Item $zipPath -Force
}

Write-Host "   Coletando arquivos (excluindo desnecessarios)..." -ForegroundColor Cyan

# Funcao para verificar se um item deve ser excluido
function Should-ExcludeItem {
    param($itemPath, $itemName)
    
    # Lista de diretorios a excluir
    $excludeDirs = @(
        "node_modules",
        ".pnp",
        ".vscode",
        ".idea",
        "coverage",
        "build",
        "dist",
        ".vite",
        ".supabase",
        "supabase\.temp",
        "logs",
        ".cache",
        ".parcel-cache",
        ".next",
        "out",
        ".local",
        ".localhost",
        ".git"
    )
    
    # Lista de extensoes/arquivos a excluir
    $excludeFiles = @(
        "*.log",
        "*.swp",
        "*.swo",
        "*~",
        "*.tmp",
        "*.temp",
        "*.tsbuildinfo",
        "*.zip",
        ".DS_Store",
        "Thumbs.db",
        "desktop.ini",
        ".eslintcache",
        ".stylelintcache",
        ".env.local",
        ".env.*.local"
    )
    
    # Verificar diretorios
    foreach ($dir in $excludeDirs) {
        if ($itemPath -like "*\$dir\*" -or $itemPath -like "*\$dir" -or $itemName -eq $dir) {
            return $true
        }
    }
    
    # Verificar arquivos por extensao/nome
    foreach ($pattern in $excludeFiles) {
        if ($itemName -like $pattern -or $itemPath -like "*\$pattern") {
            return $true
        }
    }
    
    return $false
}

# Obter todos os arquivos e pastas, excluindo os desnecessarios
$allItems = Get-ChildItem -Path $workingDir -Recurse -Force | Where-Object {
    $item = $_
    $relativePath = $item.FullName.Replace($workingDir, '').TrimStart('\')
    
    if ($item.PSIsContainer) {
        # Se for diretorio excluido, nao incluir
        return -not (Should-ExcludeItem $relativePath $item.Name)
    } else {
        # Se for arquivo excluido, nao incluir
        return -not (Should-ExcludeItem $relativePath $item.Name)
    }
}

$fileCount = ($allItems | Where-Object { -not $_.PSIsContainer }).Count
Write-Host "   Arquivos encontrados: $fileCount" -ForegroundColor Green

# Criar ZIP usando Compress-Archive
Write-Host "   Comprimindo arquivos..." -ForegroundColor Cyan

try {
    # Usar Compress-Archive diretamente (mais simples e eficiente)
    $filesToZip = $allItems | Where-Object { -not $_.PSIsContainer } | ForEach-Object { $_.FullName }
    
    Compress-Archive -Path $filesToZip -DestinationPath $zipPath -Force -CompressionLevel Optimal
    
    # Informacoes do arquivo criado
    $zipFile = Get-Item $zipPath
    $sizeKB = [math]::Round($zipFile.Length / 1KB, 2)
    $sizeMB = [math]::Round($zipFile.Length / 1MB, 2)
    
    Write-Host ""
    Write-Host "ZIP criado com sucesso!" -ForegroundColor Green
    Write-Host "   Local: $zipPath" -ForegroundColor White
    Write-Host "   Nome: $zipName" -ForegroundColor White
    Write-Host "   Tamanho: $sizeMB MB ($sizeKB KB)" -ForegroundColor White
    Write-Host "   Arquivos: $fileCount" -ForegroundColor White
    Write-Host ""
    Write-Host "Arquivo pronto para upload no GitHub!" -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "ERRO ao criar ZIP: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Detalhes: $($_.Exception)" -ForegroundColor Yellow
    exit 1
}
