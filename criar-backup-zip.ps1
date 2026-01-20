# ============================================================================
# SCRIPT: Criar Backup ZIP do Codigo Fonte
# Descricao: Cria um arquivo ZIP com todo o codigo fonte (sem node_modules, etc)
# ============================================================================

Write-Host "Criando backup ZIP do codigo fonte..." -ForegroundColor Cyan
Write-Host ""

# Obter caminho atual
$projectPath = (Get-Location).Path
$projectName = Split-Path -Leaf $projectPath

# Criar nome do arquivo com timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$zipFileName = "Rendizy_Backup_$timestamp.zip"

# Pasta de destino (Downloads do usuario)
$downloadsPath = Join-Path $env:USERPROFILE "Downloads"
$zipFilePath = Join-Path $downloadsPath $zipFileName

Write-Host "Projeto: $projectName" -ForegroundColor Yellow
Write-Host "Destino: $zipFilePath" -ForegroundColor Yellow
Write-Host ""

# Verificar se ja existe arquivo com mesmo nome
if (Test-Path $zipFilePath) {
    Write-Host "Arquivo ja existe. Removendo..." -ForegroundColor Yellow
    Remove-Item $zipFilePath -Force
}

Write-Host "Listando arquivos (excluindo desnecessarios)..." -ForegroundColor Yellow

# Lista de pastas/arquivos para EXCLUIR
$excludePatterns = @(
    "node_modules",
    ".git",
    ".vscode",
    ".idea",
    "build",
    "dist",
    ".vite",
    ".supabase",
    ".cache",
    ".parcel-cache",
    "coverage",
    ".next",
    "out",
    ".local",
    ".localhost",
    ".temp",
    ".tmp"
)

# Obter arquivos excluindo os desnecessarios
$files = Get-ChildItem -Path $projectPath -Recurse -File | Where-Object {
    $file = $_
    $relativePath = $file.FullName.Replace($projectPath, '').TrimStart('\')
    $shouldExclude = $false
    
    # Verificar padroes de exclusao
    foreach ($pattern in $excludePatterns) {
        if ($relativePath -like "*\$pattern\*" -or 
            $relativePath -like "$pattern\*" -or 
            $relativePath -eq $pattern) {
            $shouldExclude = $true
            break
        }
    }
    
    # Excluir arquivos especificos
    if ($file.Name -like "*.log" -or 
        $file.Name -eq ".DS_Store" -or 
        $file.Name -eq "Thumbs.db" -or
        $file.Name -eq "desktop.ini" -or
        $file.Name -like "*.zip") {
        $shouldExclude = $true
    }
    
    return -not $shouldExclude
}

$fileCount = $files.Count
$totalSize = ($files | Measure-Object -Property Length -Sum).Sum
$totalSizeMB = [math]::Round($totalSize / 1MB, 2)

Write-Host "   Arquivos encontrados: $fileCount" -ForegroundColor Green
Write-Host "   Tamanho total: $totalSizeMB MB" -ForegroundColor Green

# Criar ZIP
Write-Host ""
Write-Host "Compactando arquivos..." -ForegroundColor Yellow
Write-Host "   Aguarde, isso pode levar alguns segundos..." -ForegroundColor DarkGray

try {
    # Usar Compress-Archive diretamente (mais simples e eficiente)
    $filesToZip = $files | ForEach-Object { $_.FullName }
    Compress-Archive -Path $filesToZip -DestinationPath $zipFilePath -Force -CompressionLevel Optimal
    Write-Host "ZIP criado com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "Erro ao criar ZIP: $_" -ForegroundColor Red
    exit 1
}

# Calcular tamanho do arquivo
if (Test-Path $zipFilePath) {
    $zipSize = (Get-Item $zipFilePath).Length
    $zipSizeMB = [math]::Round($zipSize / 1MB, 2)
    
    Write-Host ""
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host "BACKUP CRIADO COM SUCESSO!" -ForegroundColor Green
    Write-Host "===============================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Arquivo: $zipFileName" -ForegroundColor Yellow
    Write-Host "Local: $downloadsPath" -ForegroundColor Yellow
    Write-Host "Tamanho: $zipSizeMB MB" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Backup completo do codigo fonte!" -ForegroundColor Green
    Write-Host ""
    
    # Perguntar se deseja abrir a pasta
    $openFolder = Read-Host "Deseja abrir a pasta Downloads? (s/n)"
    if ($openFolder -eq "s" -or $openFolder -eq "S") {
        Start-Process "explorer.exe" -ArgumentList $downloadsPath
    }
} else {
    Write-Host "Erro: Arquivo ZIP nao foi criado" -ForegroundColor Red
    exit 1
}
