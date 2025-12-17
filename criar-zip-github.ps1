# Script para criar ZIP do código para push no GitHub
# Exclui node_modules, .git, builds, backups e arquivos temporários

$ErrorActionPreference = "Stop"

# Nome do arquivo ZIP com timestamp
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$zipFileName = "rendizy-codigo-completo-$timestamp.zip"
$zipPath = Join-Path $PSScriptRoot $zipFileName

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Criando ZIP do código para GitHub" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Diretório raiz do projeto
$rootDir = $PSScriptRoot

# Lista de exclusões
$excludePatterns = @(
    "node_modules",
    ".git",
    ".supabase",
    "build",
    "dist",
    ".vite",
    ".cache",
    ".temp",
    ".tmp",
    "coverage",
    ".next",
    "out",
    ".pnp",
    ".vscode",
    ".idea",
    "*.log",
    "*.zip",
    "*.tmp",
    "*.temp",
    "Thumbs.db",
    "desktop.ini",
    ".DS_Store",
    "*.swp",
    "*.swo",
    "*~",
    ".env",
    ".env.local",
    ".env.*.local",
    "*.tsbuildinfo",
    ".eslintcache",
    ".stylelintcache",
    ".parcel-cache",
    "logs",
    ".local",
    ".localhost"
)

# Arquivos específicos a excluir (tokens, backups, etc)
$excludeFiles = @(
    "*TOKENS*.md",
    "*ACESSOS*.md",
    "*STATUS_TOKEN*.md",
    "configurar-tokens.ps1",
    "rendizy-token.txt",
    "*BACKUP*.zip",
    "*backup*.zip",
    "Rendizy2producao",
    "RendizyPrincipal"
)

Write-Host "Coletando arquivos..." -ForegroundColor Yellow

# Obter todos os arquivos e diretórios
$allItems = Get-ChildItem -Path $rootDir -Recurse -Force | Where-Object {
    $item = $_
    $relativePath = $item.FullName.Substring($rootDir.Length + 1)
    
    # Verificar exclusões de padrões
    $shouldExclude = $false
    
    foreach ($pattern in $excludePatterns) {
        if ($pattern -like "*.*") {
            # É um padrão de arquivo
            if ($item.Name -like $pattern) {
                $shouldExclude = $true
                break
            }
        } else {
            # É um padrão de diretório
            if ($relativePath -like "*\$pattern\*" -or $relativePath -like "$pattern\*" -or $item.Name -eq $pattern) {
                $shouldExclude = $true
                break
            }
        }
    }
    
    # Verificar exclusões de arquivos específicos
    if (-not $shouldExclude) {
        foreach ($excludeFile in $excludeFiles) {
            if ($item.Name -like $excludeFile -or $relativePath -like "*\$excludeFile\*") {
                $shouldExclude = $true
                break
            }
        }
    }
    
    # Excluir o próprio arquivo ZIP que estamos criando
    if ($item.FullName -eq $zipPath) {
        $shouldExclude = $true
    }
    
    return -not $shouldExclude
}

Write-Host "Arquivos coletados: $($allItems.Count)" -ForegroundColor Green
Write-Host ""

# Criar o arquivo ZIP
Write-Host "Criando arquivo ZIP: $zipFileName" -ForegroundColor Yellow

try {
    # Usar Compress-Archive do PowerShell
    $filesToZip = $allItems | Where-Object { -not $_.PSIsContainer }
    
    if ($filesToZip.Count -eq 0) {
        Write-Host "ERRO: Nenhum arquivo encontrado para incluir no ZIP!" -ForegroundColor Red
        exit 1
    }
    
    # Criar ZIP usando .NET
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    
    if (Test-Path $zipPath) {
        Remove-Item $zipPath -Force
    }
    
    $zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Create)
    
    $fileCount = 0
    foreach ($file in $filesToZip) {
        $relativePath = $file.FullName.Substring($rootDir.Length + 1)
        $entry = $zip.CreateEntry($relativePath)
        $entryStream = $entry.Open()
        $fileStream = [System.IO.File]::OpenRead($file.FullName)
        $fileStream.CopyTo($entryStream)
        $fileStream.Close()
        $entryStream.Close()
        $fileCount++
        
        if ($fileCount % 100 -eq 0) {
            Write-Host "  Processados: $fileCount arquivos..." -ForegroundColor Gray
        }
    }
    
    $zip.Dispose()
    
    $zipSize = (Get-Item $zipPath).Length / 1MB
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "ZIP criado com sucesso!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Arquivo: $zipFileName" -ForegroundColor White
    Write-Host "Tamanho: $([math]::Round($zipSize, 2)) MB" -ForegroundColor White
    Write-Host "Arquivos incluídos: $fileCount" -ForegroundColor White
    Write-Host "Localização: $zipPath" -ForegroundColor White
    Write-Host ""
    Write-Host "Agora você pode fazer o push forçado no GitHub!" -ForegroundColor Cyan
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "ERRO ao criar ZIP: $_" -ForegroundColor Red
    exit 1
}

